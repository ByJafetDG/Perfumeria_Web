import { Router } from 'express'
import { supabase } from '../services/supabase.js'
import { log } from '../lib/logger.js'

const router = Router()

// order_status enum:   pending | confirmed | paid | shipped | delivered | cancelled | refunded
// payment_status enum: pending | processing | completed | failed | refunded
const STATUS_MAP = {
  approved: { status: 'paid',      payment_status: 'completed' },
  rejected: { status: 'cancelled', payment_status: 'failed'    },
  pending:  { status: 'pending',   payment_status: 'pending'   },
}

// POST /webhooks/tilopay
router.post('/tilopay', async (req, res) => {
  const { orderNumber, status, reference } = req.body

  if (!orderNumber || !status) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const mapped = STATUS_MAP[status?.toLowerCase()]
  if (!mapped) return res.status(400).json({ error: 'Unknown status' })

  const update = { ...mapped }
  if (reference) update.payment_ref = reference

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('order_number', orderNumber)

  if (error) {
    log.error({ err: error, orderNumber }, 'Webhook DB update failed')
    return res.status(500).json({ error: 'DB update failed' })
  }

  log.info({ orderNumber, ...mapped }, 'Webhook processed')
  res.json({ ok: true })
})

export default router
