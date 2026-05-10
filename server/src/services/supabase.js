import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

// Service role: bypasa RLS — solo usar server-side
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey)
