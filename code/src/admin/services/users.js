import { supabase } from '../../lib/supabase';

export async function fetchAdminUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, role, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
