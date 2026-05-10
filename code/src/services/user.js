import { supabase } from '../lib/supabase';

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, role, avatar_url, profile_updated_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId, { first_name, last_name, phone }) {
  const { data: current, error: fetchErr } = await supabase
    .from('users')
    .select('profile_updated_at')
    .eq('id', userId)
    .single();
  if (fetchErr) throw fetchErr;

  if (current.profile_updated_at) {
    const daysSince = (Date.now() - new Date(current.profile_updated_at).getTime()) / 86_400_000;
    if (daysSince < 30) {
      const nextDate = new Date(new Date(current.profile_updated_at).getTime() + 30 * 86_400_000);
      throw new Error(`COOLDOWN:${nextDate.toISOString()}`);
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ first_name, last_name, phone, profile_updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchOrderHistory(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_provider, total, created_at, order_items(fragrance_name, quantity)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Returns the most recent active order for the user, or null if none.
export async function fetchActiveOrder(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, payment_provider, created_at')
    .eq('user_id', userId)
    .not('status', 'in', '("delivered","cancelled","refunded")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data; // null when no active orders
}
