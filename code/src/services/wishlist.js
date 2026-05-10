import { supabase } from '../lib/supabase';

const WISHLIST_SELECT = `
  id, fragrance_id,
  fragrances (
    id, name, slug, main_image_url,
    lines ( brands ( name ) ),
    presentations ( price, compare_price )
  )
`;

function mapDbItem(row) {
  const f = row.fragrances;
  if (!f) return null;
  const presentations = f.presentations ?? [];
  const minPres = presentations.reduce(
    (min, p) => (!min || Number(p.price) < Number(min.price) ? p : min),
    null
  );
  return {
    _dbId:        row.id,
    id:           f.id,
    name:         f.name,
    slug:         f.slug,
    imageUrl:     f.main_image_url,
    brand:        f.lines?.brands?.name ?? '',
    price:        minPres ? Number(minPres.price) : 0,
    comparePrice: minPres?.compare_price ? Number(minPres.compare_price) : null,
  };
}

export async function fetchWishlistItems(userId) {
  const { data, error } = await supabase
    .from('wishlists')
    .select(WISHLIST_SELECT)
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(mapDbItem).filter(Boolean);
}

export async function addToWishlist(userId, fragranceId) {
  const { error } = await supabase
    .from('wishlists')
    .upsert({ user_id: userId, fragrance_id: fragranceId }, { onConflict: 'user_id,fragrance_id' });
  if (error) throw error;
}

export async function removeFromWishlist(userId, fragranceId) {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('fragrance_id', fragranceId);
  if (error) throw error;
}

// Merges guest localStorage items into the user's Supabase wishlist
export async function mergeGuestItems(userId, guestItems) {
  if (!guestItems?.length) return;
  const rows = guestItems.map(p => ({ user_id: userId, fragrance_id: p.id }));
  const { error } = await supabase
    .from('wishlists')
    .upsert(rows, { onConflict: 'user_id,fragrance_id' });
  if (error) throw error;
}
