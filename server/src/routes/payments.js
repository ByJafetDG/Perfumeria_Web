import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { createPayment } from '../services/tilopay.js'
import { supabase } from '../services/supabase.js'
import { log } from '../lib/logger.js'
import { calcEffectivePrice } from '../lib/promoUtils.js'

const router = Router()

const SHIPPING_PRICES = { pickup: 3500, correos: 3500 }

function buildOrderNumber(prefix) {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const stamp =
    String(now.getFullYear()).slice(-2) +
    pad(now.getMonth() + 1) + pad(now.getDate()) +
    pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds())
  return `${prefix}-${stamp}`
}

function parseCartKey(cartKey) {
  const key = cartKey ?? ''
  const optId  = key.slice(-36)
  const format = key.slice(37, -37) // 'botella' or 'decant'
  return { format, optId }
}

async function deleteOrder(orderId) {
  await supabase.from('order_items').delete().eq('order_id', orderId).catch(() => {})
  await supabase.from('orders').delete().eq('id', orderId).catch(() => {})
}

// POST /payments/create
// Body option A (new payment):  { cartItems, shipping, orderPrefix }
// Body option B (retry):        { orderId }
router.post('/create', requireAuth, async (req, res) => {
  const { orderId, cartItems, shipping, orderPrefix } = req.body

  let order
  let createdHere = false

  // ── Option B: retry with existing order ──────────────────────────────
  if (orderId) {
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return res.status(400).json({ error: 'orderId must be a non-empty string' })
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total, status, shipping_address, shipping_city, shipping_province')
      .eq('id', orderId)
      .eq('user_id', req.user.id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Order not found' })
    if (!['pending', 'cancelled'].includes(data.status)) return res.status(400).json({ error: 'Order not payable' })

    if (data.status === 'cancelled') {
      const { error: resetErr } = await supabase
        .from('orders')
        .update({ status: 'pending', payment_status: 'processing' })
        .eq('id', orderId)
      if (resetErr) {
        log.error({ resetErr, orderId }, 'Failed to reset cancelled order for retry')
        return res.status(500).json({ error: 'Failed to reset order' })
      }
    }

    order = data

  // ── Option A: new card payment — create order server-side ─────────────
  } else {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'cartItems required' })
    }
    if (!shipping?.shippingMethod || !shipping?.provincia) {
      return res.status(400).json({ error: 'shipping data incomplete' })
    }

    // ── Stock pre-check + fetch promo from DB (don't trust client promo data) ──
    const enrichedItems = []
    for (const item of cartItems) {
      const { format, optId } = parseCartKey(item.cartKey)
      if (format === 'botella') {
        const { data: pres } = await supabase.from('presentations')
          .select('stock, fragrances ( promo_type, promo_value, discount_pct )')
          .eq('id', optId).single()
        if (!pres || pres.stock < Number(item.qty)) {
          return res.status(409).json({ error: 'OUT_OF_STOCK', item: item.name })
        }
        enrichedItems.push({ ...item, _promo: pres.fragrances })
      } else if (format === 'decant') {
        const { data: dec } = await supabase.from('decants')
          .select('stock, fragrances ( promo_type, promo_value, discount_pct )')
          .eq('id', optId).single()
        if (!dec || dec.stock < Number(item.qty)) {
          return res.status(409).json({ error: 'OUT_OF_STOCK', item: item.name })
        }
        enrichedItems.push({ ...item, _promo: dec.fragrances })
      } else {
        enrichedItems.push({ ...item, _promo: null })
      }
    }

    const prefix       = typeof orderPrefix === 'string' ? orderPrefix : 'PF'
    const shippingCost = SHIPPING_PRICES[shipping.shippingMethod] ?? 0
    const subtotal     = enrichedItems.reduce((s, i) => {
      const { subtotal: sub } = calcEffectivePrice(
        Number(i.price), Number(i.qty), i._promo?.promo_type, i._promo?.discount_pct
      )
      return s + sub
    }, 0)
    const discount     = enrichedItems.reduce((s, i) => {
      const { discount: d } = calcEffectivePrice(
        Number(i.price), Number(i.qty), i._promo?.promo_type, i._promo?.discount_pct
      )
      return s + d
    }, 0)
    const total        = subtotal + shippingCost
    const orderNumber  = buildOrderNumber(prefix)

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number:      orderNumber,
        user_id:           req.user.id,
        status:            'pending',
        subtotal,
        discount,
        shipping_cost:     shippingCost,
        tax:               0,
        total,
        payment_provider:  'tilopay',
        payment_status:    'processing',
        shipping_province: shipping.provincia || null,
        shipping_city:     shipping.canton    || null,
        shipping_district: shipping.distrito  || null,
        shipping_address:  shipping.address   || null,
        tracking_number:   null,
      })
      .select('id, order_number, total, shipping_address, shipping_city, shipping_province')
      .single()

    if (orderErr) {
      log.error({ orderErr }, 'Failed to create order')
      return res.status(500).json({ error: 'Failed to create order' })
    }

    const items = enrichedItems.map(item => {
      const { format, optId } = parseCartKey(item.cartKey)
      const { unitPrice, subtotal: itemSub } = calcEffectivePrice(
        Number(item.price), Number(item.qty), item._promo?.promo_type, item._promo?.discount_pct
      )
      return {
        order_id:        newOrder.id,
        item_type:       format === 'decant' ? 'decant' : 'full',
        presentation_id: format === 'botella' ? optId : null,
        decant_id:       format === 'decant'  ? optId : null,
        fragrance_name:  item.name,
        brand_name:      item.brand,
        size_ml:         item.size_ml,
        quantity:        item.qty,
        unit_price:      unitPrice,
        subtotal:        itemSub,
        promo_type:      item._promo?.promo_type   ?? null,
        promo_value:     item._promo?.promo_value  ?? null,
        discount_pct:    item._promo?.discount_pct ?? null,
      }
    })

    const { error: itemsErr } = await supabase.from('order_items').insert(items)
    if (itemsErr) {
      await deleteOrder(newOrder.id)
      log.error({ itemsErr }, 'Failed to insert order items')
      return res.status(500).json({ error: 'Failed to create order' })
    }

    order = newOrder
    createdHere = true
  }

  // ── Fetch user profile for billing ────────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, phone')
    .eq('id', req.user.id)
    .single()

  // ── Call Tilopay ──────────────────────────────────────────────────────
  try {
    const payment = await createPayment({
      orderId:     order.order_number,
      amount:      order.total,
      redirectUrl: `${req.headers.origin ?? ''}/payment/result`,
      billing: {
        firstName: profile?.first_name ?? '',
        lastName:  profile?.last_name  ?? '',
        email:     req.user.email,
        phone:     profile?.phone      ?? '',
        address:   order.shipping_address  ?? '',
        city:      order.shipping_city     ?? '',
        state:     order.shipping_province ?? '',
        country:   'CR',
      },
    })

    const paymentUrl = payment.url ?? payment.redirect ?? payment.redirect_url
    if (!paymentUrl) {
      log.error({ payment }, 'Tilopay response missing redirect URL')
      if (createdHere) await deleteOrder(order.id)
      return res.status(502).json({ error: 'Payment provider error' })
    }

    res.json({
      paymentUrl,
      orderId:    order.id,
      orderNumber: order.order_number,
      reference:  payment.tpt ?? payment.reference,
    })
  } catch (err) {
    log.error({ err, orderId: order?.id }, 'Tilopay payment creation failed')
    if (createdHere) await deleteOrder(order.id)
    res.status(502).json({ error: 'Payment provider error' })
  }
})

// POST /payments/verify
router.post('/verify', requireAuth, async (req, res) => {
  const { orderNumber, code } = req.body
  if (!orderNumber || code === undefined) {
    return res.status(400).json({ error: 'orderNumber and code required' })
  }

  const approved = code === 1 || code === '1' || code === 1101 || code === '1101'

  if (!approved) {
    const { error: cancelErr } = await supabase
      .from('orders')
      .update({ status: 'cancelled', payment_status: 'failed' })
      .eq('order_number', orderNumber)
      .eq('user_id', req.user.id)

    if (cancelErr) log.error({ err: cancelErr, orderNumber }, 'Verify: failed to cancel rejected order')

    return res.json({ success: false })
  }

  // ── Decrement stock atomically before marking paid ────────────────────
  // The trigger would also fire, but the idempotency flag prevents double-decrement.
  // Calling it here gives us the result so we can inform the frontend.
  let outOfStock = false
  let soldOutItem = null

  const { data: orderRow } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .eq('user_id', req.user.id)
    .single()

  if (orderRow) {
    const { data: stockResult } = await supabase
      .rpc('decrement_order_stock', { p_order_id: orderRow.id })

    if (stockResult && !stockResult.success && !stockResult.skipped) {
      outOfStock = true
      const prefix = 'STOCK_INSUFICIENTE:'
      soldOutItem = stockResult.error?.startsWith(prefix)
        ? stockResult.error.slice(prefix.length)
        : null
      log.warn({ orderNumber, stockResult }, 'Payment verified but stock depleted — admin must handle refund')
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid', payment_status: 'completed' })
    .eq('order_number', orderNumber)
    .eq('user_id', req.user.id)

  if (error) {
    log.error({ err: error, orderNumber }, 'Verify: DB update failed')
    return res.status(500).json({ error: 'DB error' })
  }

  log.info({ orderNumber, outOfStock }, 'Payment verified and marked paid')

  if (outOfStock) {
    return res.json({ success: true, outOfStock: true, soldOutItem })
  }
  res.json({ success: true })
})

// POST /payments/cancel
// Body: { orderId }  — called when user abandons TiloPay and goes back to cart
router.post('/cancel', requireAuth, async (req, res) => {
  const { orderId } = req.body
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', orderId)
    .eq('user_id', req.user.id)
    .eq('status', 'pending') // only cancel if still pending

  if (error) {
    log.error({ err: error, orderId }, 'Cancel: DB update failed')
    return res.status(500).json({ error: 'DB error' })
  }

  res.json({ success: true })
})

export default router
