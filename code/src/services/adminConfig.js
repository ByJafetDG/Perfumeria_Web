import { supabase } from '../lib/supabase';

/**
 * Fetches all rows from admin_config (key/value table) and returns them
 * as a plain object: { store_phone: '...', tilopay_api_key: '...', ... }
 */
export async function fetchAdminConfig() {
  const { data, error } = await supabase
    .from('admin_config')
    .select('key, value');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
}
