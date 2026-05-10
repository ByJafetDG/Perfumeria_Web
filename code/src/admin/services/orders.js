import { supabase } from '../../lib/supabase';

export async function fetchAdminOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, total, created_at,
      users ( first_name, last_name, email )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrderDetail(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, payment_provider, payment_ref,
      subtotal, discount, shipping_cost, tax, total,
      tracking_number, notes, created_at,
      shipping_address, shipping_city, shipping_district, shipping_province,
      users ( first_name, last_name, email, phone ),
      order_items (
        id, item_type, fragrance_name, brand_name, size_ml, quantity, unit_price, subtotal,
        promo_type, promo_value, discount_pct,
        presentations ( fragrances ( main_image_url ) ),
        decants ( fragrances ( main_image_url ) )
      )
    `)
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status, { trackingNumber, trackingUrl } = {}) {
  const payload = { status };
  if (trackingNumber !== undefined) payload.tracking_number = trackingNumber || null;
  if (trackingUrl    !== undefined) payload.tracking_url    = trackingUrl    || null;
  const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
  if (error) throw error;
}
