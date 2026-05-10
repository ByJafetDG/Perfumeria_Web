import { supabase } from '../lib/supabase';

export async function searchFragrances(query) {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_fragrances', { query: query.trim() });
  if (error) throw error;
  return data.map(f => ({
    id:       f.id,
    name:     f.name,
    slug:     f.slug,
    imageUrl: f.main_image_url,
    brand:    f.brand_name,
    price:    Number(f.price),
  }));
}

export async function getProducts() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data;
}

export async function getProductById(id) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

const PAGE_SIZE = 10;

function mapFragrance(f) {
  const presentations = f.presentations ?? [];
  const minPres = presentations.reduce((min, p) =>
    !min || Number(p.price) < Number(min.price) ? p : min, null);
  const minStock = presentations.length > 0
    ? Math.min(...presentations.map(p => Number(p.stock ?? 999)))
    : null;
  return {
    id:           f.id,
    name:         f.name,
    slug:         f.slug,
    imageUrl:     f.main_image_url,
    brand:        f.lines?.brands?.name ?? '',
    price:        minPres ? Number(minPres.price) : 0,
    comparePrice: minPres?.compare_price ? Number(minPres.compare_price) : null,
    minStock,
    promoType:    f.promo_type   ?? null,
    promoValue:   f.promo_value  ?? null,
    discountPct:  f.discount_pct ?? null,
  };
}

export async function fetchFragrances({ type = null, gender = null, page = 1 } = {}) {
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  // Decants: tabla separada
  if (type === 'decants') {
    let q = supabase
      .from('decants')
      .select(`
        id, size_ml, price, stock,
        fragrances!inner ( id, name, slug, main_image_url, gender, lines ( brands ( name ) ) )
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (gender) q = q.eq('fragrances.gender', gender);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      items: data.map(d => ({
        id:       d.fragrances.id,
        name:     `${d.fragrances.name} ${d.size_ml}ml`,
        slug:     d.fragrances.slug,
        imageUrl: d.fragrances.main_image_url,
        brand:    d.fragrances.lines?.brands?.name ?? '',
        price:    Number(d.price),
        isDecant: true,
        minStock: Number(d.stock ?? 0),
      })),
      total: count,
      pages: Math.ceil(count / PAGE_SIZE),
    };
  }

  // Fragancias con filtros opcionales
  let query = supabase
    .from('fragrances')
    .select(`
      id, name, slug, main_image_url,
      promo_type, promo_value, discount_pct,
      lines!inner ( brands!inner ( name, type ) ),
      presentations ( price, compare_price, stock )
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (type)   query = query.eq('lines.brands.type', type);
  if (gender) query = query.eq('gender', gender);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    items: data.map(mapFragrance),
    total: count,
    pages: Math.ceil(count / PAGE_SIZE),
  };
}

export async function fetchLargestPresentation(fragranceId) {
  const { data, error } = await supabase
    .from('presentations')
    .select('id, size_ml, price')
    .eq('fragrance_id', fragranceId)
    .eq('is_active', true)
    .order('size_ml', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('fetchLargestPresentation:', error); return null; }
  return data ? { id: data.id, size_ml: Number(data.size_ml), price: Number(data.price) } : null;
}

export async function fetchFragranceBySlug(slug) {
  const { data, error } = await supabase
    .from('fragrances')
    .select(`
      id, name, slug, description, main_image_url, concentration, year,
      promo_type, promo_value, discount_pct,
      lines ( brands ( name ) ),
      presentations ( id, size_ml, price, compare_price, stock, is_active ),
      decants ( id, size_ml, price, stock, is_active ),
      fragrance_notes ( layer, notes ( id, name ) )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) throw error;

  return {
    id:            data.id,
    name:          data.name,
    slug:          data.slug,
    description:   data.description,
    imageUrl:      data.main_image_url,
    concentration: data.concentration,
    year:          data.year,
    brand:         data.lines?.brands?.name ?? '',
    presentations: (data.presentations ?? [])
      .filter(p => p.is_active)
      .sort((a, b) => a.size_ml - b.size_ml)
      .map(p => ({
        id:           p.id,
        size_ml:      Number(p.size_ml),
        price:        Number(p.price),
        comparePrice: p.compare_price ? Number(p.compare_price) : null,
        stock:        Number(p.stock ?? 0),
      })),
    decants: (data.decants ?? [])
      .filter(d => d.is_active)
      .sort((a, b) => a.size_ml - b.size_ml)
      .map(d => ({
        id:      d.id,
        size_ml: Number(d.size_ml),
        price:   Number(d.price),
        stock:   Number(d.stock ?? 0),
      })),
    notes: (data.fragrance_notes ?? [])
      .filter(fn => fn.notes)
      .map(fn => ({ name: fn.notes.name, layer: fn.layer })),
    promoType:   data.promo_type   ?? null,
    promoValue:  data.promo_value  ?? null,
    discountPct: data.discount_pct ?? null,
  };
}

export async function fetchTrendingFragrances() {
  const { data, error } = await supabase
    .from('fragrances')
    .select(`
      id, name, slug, main_image_url,
      lines ( brands ( name ) ),
      fragrance_notes ( notes ( name ) )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw error;

  return data.map(f => ({
    id:       f.id,
    name:     f.name,
    slug:     f.slug,
    imageUrl: f.main_image_url,
    brand:    f.lines?.brands?.name ?? '',
    notes:    (f.fragrance_notes ?? []).map(fn => fn.notes?.name).filter(Boolean).slice(0, 4).join(' · '),
  }));
}

export async function fetchFeaturedFragrances() {
  const { data, error } = await supabase
    .from('fragrances')
    .select(`
      id, name, slug, main_image_url,
      lines ( brands ( name ) ),
      presentations ( price, compare_price )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) throw error;

  return data.map(f => {
    const presentations = f.presentations ?? [];
    const minPres = presentations.reduce((min, p) =>
      !min || Number(p.price) < Number(min.price) ? p : min, null);
    return {
      id:           f.id,
      name:         f.name,
      slug:         f.slug,
      imageUrl:     f.main_image_url,
      brand:        f.lines?.brands?.name ?? '',
      price:        minPres ? Number(minPres.price) : 0,
      comparePrice: minPres?.compare_price ? Number(minPres.compare_price) : null,
    };
  });
}
