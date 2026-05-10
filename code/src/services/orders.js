import { supabase } from '../lib/supabase';
import { parseCartKey } from './cart';
import { calcEffectivePrice } from '../utils/promoUtils';

const SHIPPING_PRICES = { pickup: 3500, correos: 3500 };

export function getShippingCost(shippingMethod) {
  return SHIPPING_PRICES[shippingMethod] ?? 0;
}

function buildOrderNumber(prefix) {
  const now = new Date();
  const pad  = n => String(n).padStart(2, '0');
  const stamp =
    String(now.getFullYear()).slice(-2) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  return `${prefix}-${stamp}`;
}

/**
 * Creates an order + order_items in Supabase.
 * Returns { id, order_number }.
 */
export async function createOrder(userId, cartItems, {
  provincia, canton, distrito, address,
  shippingMethod, paymentProvider,
  orderPrefix = 'PF',
}) {
  const shippingCost = getShippingCost(shippingMethod);
  const subtotal     = cartItems.reduce((s, i) => {
    const { subtotal: sub } = calcEffectivePrice(i.price, i.qty, i.promoType, i.discountPct);
    return s + sub;
  }, 0);
  const discount     = cartItems.reduce((s, i) => {
    const { discount: d } = calcEffectivePrice(i.price, i.qty, i.promoType, i.discountPct);
    return s + d;
  }, 0);
  const total        = subtotal + shippingCost;
  const orderNumber  = buildOrderNumber(orderPrefix);

  // payment_status: tilopay starts as 'processing' (awaiting redirect), sinpe as 'pending'
  const paymentStatus = paymentProvider === 'tilopay' ? 'processing' : 'pending';

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number:      orderNumber,
      user_id:           userId,
      status:            'pending',
      subtotal,
      discount,
      shipping_cost:     shippingCost,
      tax:               0,
      total,
      payment_provider:  paymentProvider,
      payment_status:    paymentStatus,
      shipping_province: provincia   || null,
      shipping_city:     canton      || null,
      shipping_district: distrito    || null,
      shipping_address:  address     || null,
      tracking_number:   orderNumber,
    })
    .select('id, order_number')
    .single();

  if (orderErr) throw orderErr;

  const orderItems = cartItems.map(item => {
    const { format, optId } = parseCartKey(item.cartKey);
    const { unitPrice, subtotal: itemSub } = calcEffectivePrice(
      item.price, item.qty, item.promoType, item.discountPct
    );
    return {
      order_id:        order.id,
      item_type:       format === 'decant' ? 'decant' : 'full',
      presentation_id: format === 'botella' ? optId : null,
      decant_id:       format === 'decant'  ? optId : null,
      fragrance_name:  item.name,
      brand_name:      item.brand,
      size_ml:         item.size_ml,
      quantity:        item.qty,
      unit_price:      unitPrice,
      subtotal:        itemSub,
      promo_type:      item.promoType   ?? null,
      promo_value:     item.promoValue  ?? null,
      discount_pct:    item.discountPct ?? null,
    };
  });

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);

  if (itemsErr) {
    // Rollback order row so we don't leave orphans
    await supabase.from('orders').delete().eq('id', order.id);
    throw itemsErr;
  }

  return order; // { id, order_number }
}
