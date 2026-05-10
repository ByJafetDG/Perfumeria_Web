import { supabase } from '../../lib/supabase';

export async function fetchInventoryItems() {
  const { data, error } = await supabase
    .from('fragrances')
    .select(`
      id, name, main_image_url, gender,
      lines ( brands ( name ) ),
      presentations ( id, size_ml, price, stock, is_active )
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;

  return data.flatMap(f => {
    const activePres = (f.presentations ?? [])
      .filter(p => p.is_active)
      .sort((a, b) => Number(a.size_ml) - Number(b.size_ml));

    if (activePres.length === 0) {
      return [{
        fragranceId: f.id,
        name:        f.name,
        imageUrl:    f.main_image_url,
        brand:       f.lines?.brands?.name ?? '',
        gender:      f.gender ?? 'unisex',
        presId:      null,
        sizeMl:      null,
        price:       null,
        stock:       null,
      }];
    }

    return activePres.map(p => ({
      fragranceId: f.id,
      name:        f.name,
      imageUrl:    f.main_image_url,
      brand:       f.lines?.brands?.name ?? '',
      gender:      f.gender ?? 'unisex',
      presId:      p.id,
      sizeMl:      Number(p.size_ml),
      price:       Number(p.price),
      stock:       Number(p.stock),
    }));
  });
}

export async function updatePresentationStock(id, stock) {
  const { error } = await supabase
    .from('presentations')
    .update({ stock })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFragrance(fragranceId) {
  const { error } = await supabase.rpc('delete_fragrance', { p_fragrance_id: fragranceId });
  if (error) throw error;

  // Broadcast catalog refetch — postgres_changes DELETE won't reach anon clients
  // because RLS can't evaluate a row that no longer exists.
  await new Promise((resolve) => {
    const ch = supabase.channel('catalog-control');
    const timer = setTimeout(() => { supabase.removeChannel(ch); resolve(); }, 4000);
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      ch.send({ type: 'broadcast', event: 'refetch', payload: {} })
        .finally(() => { clearTimeout(timer); supabase.removeChannel(ch); resolve(); });
    });
  });
}
