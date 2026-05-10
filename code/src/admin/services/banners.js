import { supabase } from '../../lib/supabase';

export async function fetchAllBannerSlides() {
  const { data, error } = await supabase
    .from('banner_slides')
    .select(`
      id, type, label, headline, subtext,
      cta_text, cta_link, discount_pct, promo_type, promo_value,
      fragrance_id, sort_order, is_active,
      starts_at, ends_at,
      fragrances ( id, name, slug, main_image_url )
    `)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertBannerSlide(id, payload) {
  if (id) {
    const { error } = await supabase.from('banner_slides').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('banner_slides').insert(payload);
    if (error) throw error;
  }
}

export async function deleteBannerSlide(id) {
  const { error } = await supabase.from('banner_slides').delete().eq('id', id);
  if (error) throw error;
}

export async function swapSortOrder(idA, orderA, idB, orderB) {
  const { error: e1 } = await supabase.from('banner_slides').update({ sort_order: orderB }).eq('id', idA);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('banner_slides').update({ sort_order: orderA }).eq('id', idB);
  if (e2) throw e2;
}

export async function searchFragrances(q) {
  const { data, error } = await supabase
    .from('fragrances')
    .select('id, name, slug, main_image_url')
    .ilike('name', `%${q}%`)
    .eq('is_active', true)
    .limit(8);
  if (error) throw error;
  return data ?? [];
}
