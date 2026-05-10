import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

// Cliente anon para verificar JWT del usuario (no service role)
const supabaseAuth = createClient(env.supabaseUrl, env.supabaseServiceKey)

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' })
  }

  const token = authHeader.slice(7)
  const { data, error } = await supabaseAuth.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  req.user = data.user
  next()
}
