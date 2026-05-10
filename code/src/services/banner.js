import { supabase } from '../lib/supabase';

export async function fetchActiveBannerSlides() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('banner_slides')
    .select(`
      id, type, label, headline, subtext,
      cta_text, cta_link,
      discount_pct, promo_type, promo_value,
      fragrance_id,
      fragrances ( main_image_url )
    `)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
