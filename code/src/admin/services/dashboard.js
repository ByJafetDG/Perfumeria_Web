import { supabase } from '../../lib/supabase';

export async function fetchRecentOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, total, status, created_at,
      users!orders_user_id_fkey ( first_name, last_name ),
      order_items ( presentation_id, decant_id, fragrance_name )
    `)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw error;

  // Resolve first available fragrance image per order
  const withImages = await Promise.all(
    (orders ?? []).map(async o => {
      let imageUrl = null;

      for (const item of (o.order_items ?? [])) {
        if (item.presentation_id) {
          const { data: p } = await supabase
            .from('presentations')
            .select('fragrances ( main_image_url )')
            .eq('id', item.presentation_id)
            .single();
          imageUrl = p?.fragrances?.main_image_url || null;
        } else if (item.decant_id) {
          const { data: d } = await supabase
            .from('decants')
            .select('fragrances ( main_image_url )')
            .eq('id', item.decant_id)
            .single();
          imageUrl = d?.fragrances?.main_image_url || null;
        } else if (item.fragrance_name) {
          const { data: f } = await supabase
            .from('fragrances')
            .select('main_image_url')
            .ilike('name', item.fragrance_name)
            .maybeSingle();
          imageUrl = f?.main_image_url || null;
        }
        if (imageUrl) break;
      }

      return {
        id: o.id,
        total: parseFloat(o.total),
        status: o.status,
        createdAt: o.created_at,
        firstName: o.users?.first_name ?? '',
        lastName: o.users?.last_name ?? '',
        itemCount: o.order_items?.length ?? 0,
        imageUrl,
      };
    })
  );

  return withImages;
}

export async function fetchLowStockItems() {
  const { data, error } = await supabase
    .from('presentations')
    .select(`
      id, size_ml, stock,
      fragrances ( name, main_image_url, lines ( brands ( name ) ) )
    `)
    .lte('stock', 5)
    .eq('is_active', true)
    .order('stock', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchDashboardKpis() {
  // Use local date boundaries converted to UTC so the filter respects
  // the store's timezone (e.g. UTC-6 Costa Rica) instead of raw UTC dates.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [ventasHoyRes, pedidosRes, stockRes, ventasMesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .eq('status', 'paid')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("cancelled","shipped","delivered","refunded")'),
    supabase
      .from('presentations')
      .select('id', { count: 'exact', head: true })
      .lte('stock', 5)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('total')
      .eq('status', 'paid')
      .gte('created_at', monthStart),
  ]);

  const ventasHoy = (ventasHoyRes.data ?? []).reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
  const ventasMes  = (ventasMesRes.data  ?? []).reduce((s, o) => s + parseFloat(o.total ?? 0), 0);

  return {
    ventasHoy,
    pedidosPendientes: pedidosRes.count ?? 0,
    stockCritico: stockRes.count ?? 0,
    ventasMes,
  };
}
