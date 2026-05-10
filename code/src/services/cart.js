import { supabase } from '../lib/supabase';

// cartKey format: `${fragranceId}-${format}-${optId}`
// format is 'botella' or 'decant', fragranceId and optId are UUIDs (36 chars each)
export function parseCartKey(cartKey) {
  const fragranceId = cartKey.slice(0, 36);
  const optId       = cartKey.slice(-36);
  const format      = cartKey.slice(37, -37); // 'botella' or 'decant'
  return { fragranceId, format, optId };
}

// Gets the user's cart row, creating it if it doesn't exist
export async function getOrCreateCart(userId) {
  const { data, error } = await supabase
    .from('carts')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// Maps a DB cart_items row (with joins) to the in-memory item shape
function mapDbItem(row) {
  const isDecant = row.item_type === 'decant';
  const opt  = isDecant ? row.decants      : row.presentations;
  const frag = isDecant ? row.decants?.fragrances : row.presentations?.fragrances;
  if (!opt || !frag) return null;

  return {
    _dbId:      row.id,
    cartKey:    `${frag.id}-${isDecant ? 'decant' : 'botella'}-${opt.id}`,
    productId:  frag.id,
    slug:       frag.slug,
    name:       frag.name,
    brand:      frag.lines?.brands?.name ?? '',
    imageUrl:   frag.main_image_url,
    format:     isDecant ? 'decant' : 'botella',
    size_ml:    opt.size_ml,
    price:      opt.price,
    qty:        row.quantity,
    promoType:  frag.promo_type   ?? null,
    promoValue: frag.promo_value  ?? null,
    discountPct:frag.discount_pct ?? null,
  };
}

const CART_ITEMS_SELECT = `
  id, item_type, presentation_id, decant_id, quantity,
  presentations (
    id, size_ml, price,
    fragrances ( id, name, slug, main_image_url, promo_type, promo_value, discount_pct, lines ( brands ( name ) ) )
  ),
  decants (
    id, size_ml, price,
    fragrances ( id, name, slug, main_image_url, promo_type, promo_value, discount_pct, lines ( brands ( name ) ) )
  )
`;

export async function fetchCartItems(userId) {
  const cartId = await getOrCreateCart(userId);
  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_ITEMS_SELECT)
    .eq('cart_id', cartId);
  if (error) throw error;
  return (data ?? []).map(mapDbItem).filter(Boolean);
}

export async function addCartItem(userId, item) {
  const cartId = await getOrCreateCart(userId);
  const { format, optId } = parseCartKey(item.cartKey);
  const isDecant = format === 'decant';

  // Try to increment quantity of existing item first
  const matchCol = isDecant ? 'decant_id' : 'presentation_id';
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq(matchCol, optId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({
        cart_id:         cartId,
        item_type:       isDecant ? 'decant' : 'full',
        presentation_id: isDecant ? null : optId,
        decant_id:       isDecant ? optId : null,
        quantity:        1,
      });
    if (error) throw error;
  }
}

export async function updateCartItemQty(dbId, qty) {
  if (qty < 1) return;
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: qty })
    .eq('id', dbId);
  if (error) throw error;
}

export async function deleteCartItem(dbId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', dbId);
  if (error) throw error;
}

// Merges guest localStorage items into the user's Supabase cart
export async function mergeGuestItems(userId, guestItems) {
  if (!guestItems?.length) return;
  const cartId = await getOrCreateCart(userId);

  for (const item of guestItems) {
    const { format, optId } = parseCartKey(item.cartKey);
    const isDecant = format === 'decant';
    const matchCol = isDecant ? 'decant_id' : 'presentation_id';

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq(matchCol, optId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + (item.qty ?? 1) })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('cart_items')
        .insert({
          cart_id:         cartId,
          item_type:       isDecant ? 'decant' : 'full',
          presentation_id: isDecant ? null : optId,
          decant_id:       isDecant ? optId : null,
          quantity:        item.qty ?? 1,
        });
    }
  }
}
