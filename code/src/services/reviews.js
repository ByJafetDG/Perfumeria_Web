import { supabase } from '../lib/supabase';

const PAGE_SIZE = 5;

/** Returns true if the user has at least one completed order containing this fragrance. */
export async function checkUserPurchased(userId, fragranceId) {
  const [{ data: pres }, { data: dec }] = await Promise.all([
    supabase.from('presentations').select('id').eq('fragrance_id', fragranceId),
    supabase.from('decants').select('id').eq('fragrance_id', fragranceId),
  ]);

  const presIds = (pres ?? []).map(p => p.id);
  const decIds  = (dec ?? []).map(d => d.id);
  if (!presIds.length && !decIds.length) return false;

  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId);

  if (!orders?.length) return false;
  const orderIds = orders.map(o => o.id);

  const conditions = [];
  if (presIds.length) conditions.push(`presentation_id.in.(${presIds.join(',')})`);
  if (decIds.length)  conditions.push(`decant_id.in.(${decIds.join(',')})`);

  const { data } = await supabase
    .from('order_items')
    .select('id')
    .in('order_id', orderIds)
    .or(conditions.join(','))
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/** Returns true if the user already submitted a review for this fragrance. */
export async function checkUserReview(userId, fragranceId) {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('fragrance_id', fragranceId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Inserts a new review (pending approval). */
export async function submitReview(userId, fragranceId, { rating, comment }) {
  const { error } = await supabase
    .from('reviews')
    .insert({
      user_id:              userId,
      fragrance_id:         fragranceId,
      rating,
      comment,
      is_verified_purchase: true,
      is_approved:          true,
    });
  if (error) throw error;
}

function formatUsername(profile) {
  if (!profile) return 'Anónimo';
  const first   = profile.first_name   ?? '';
  const initial = profile.last_initial ?? '';
  return `${first}${initial ? ' ' + initial + '.' : ''}`.trim() || 'Anónimo';
}

export async function fetchReviews(fragranceId, offset = 0) {
  const [pageResult, allRatings] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        public_profiles ( first_name, last_initial )
      `, { count: 'exact' })
      .eq('fragrance_id', fragranceId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),

    supabase
      .from('reviews')
      .select('rating')
      .eq('fragrance_id', fragranceId)
      .eq('is_approved', true),
  ]);

  if (pageResult.error) throw pageResult.error;

  const ratings = allRatings.data ?? [];
  const avgRating = ratings.length
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 0;

  return {
    items: pageResult.data.map(r => ({
      id:       r.id,
      rating:   r.rating,
      comment:  r.comment,
      username: formatUsername(r.public_profiles),
    })),
    total:     pageResult.count,
    avgRating,
  };
}
