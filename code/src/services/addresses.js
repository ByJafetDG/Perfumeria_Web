import { supabase } from '../lib/supabase';

export async function fetchUserAddresses(userId) {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAddress(userId, { label, province, city, district, address_line, additional_info, is_default }) {
  // Si la nueva dirección es default, quitarle default a las demás primero
  if (is_default) {
    await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
  }
  const { data, error } = await supabase
    .from('user_addresses')
    .insert({
      user_id: userId,
      label:           label || null,
      country:         'CR',
      province,
      city,
      district:        district || null,
      address_line,
      additional_info: additional_info || null,
      is_default:      is_default ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAddress(id, userId, { label, province, city, district, address_line, additional_info, is_default }) {
  if (is_default) {
    await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
  }
  const { data, error } = await supabase
    .from('user_addresses')
    .update({
      label:           label || null,
      province,
      city,
      district:        district || null,
      address_line,
      additional_info: additional_info || null,
      is_default:      is_default ?? false,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAddress(id, userId) {
  const { error } = await supabase
    .from('user_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setDefaultAddress(id, userId) {
  await supabase
    .from('user_addresses')
    .update({ is_default: false })
    .eq('user_id', userId);
  const { error } = await supabase
    .from('user_addresses')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}
