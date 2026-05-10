import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'
import { log } from '../lib/logger.js'

const router = Router()

// DELETE /orders/:id
// Deletes order + items only if status is pending or cancelled and belongs to the user
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, user_id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single()

  if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' })

  if (!['pending', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ error: 'Only pending or cancelled orders can be deleted' })
  }

  await supabase.from('order_items').delete().eq('order_id', id)

  const { error: deleteErr } = await supabase.from('orders').delete().eq('id', id)

  if (deleteErr) {
    log.error({ err: deleteErr, id }, 'Failed to delete order')
    return res.status(500).json({ error: 'Failed to delete order' })
  }

  log.info({ orderId: id }, 'Order deleted by user')
  res.json({ success: true })
})

export default router
