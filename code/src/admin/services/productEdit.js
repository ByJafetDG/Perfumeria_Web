import { supabase } from '../../lib/supabase';

const IMAGE_BUCKET = 'fragrance-images';

// ── Read ──────────────────────────────────────────────────────
export async function fetchFragranceForEdit(fragranceId) {
  const { data, error } = await supabase
    .from('fragrances')
    .select(`
      id, name, slug, main_image_url, gender, description,
      concentration, year, is_active, line_id,
      lines ( id, name, brands ( id, name ) ),
      presentations ( id, size_ml, price, compare_price, stock, is_active ),
      decants ( id, size_ml, price, stock, is_active ),
      fragrance_notes ( note_id, layer, percentage, notes ( id, name ) )
    `)
    .eq('id', fragranceId)
    .single();

  if (error) throw error;

  return {
    id:            data.id,
    name:          data.name ?? '',
    slug:          data.slug ?? '',
    imageUrl:      data.main_image_url ?? '',
    gender:        data.gender ?? 'unisex',
    description:   data.description ?? '',
    concentration: data.concentration ?? '',
    year:          data.year ?? '',
    isActive:      data.is_active ?? true,
    lineId:        data.line_id,
    brandId:       data.lines?.brands?.id ?? null,
    brandName:     data.lines?.brands?.name ?? '',
    presentations: (data.presentations ?? [])
      .sort((a, b) => Number(a.size_ml) - Number(b.size_ml))
      .map(p => ({
        id:           p.id,
        sizeMl:       String(p.size_ml),
        price:        String(p.price),
        comparePrice: p.compare_price ? String(p.compare_price) : '',
        stock:        String(p.stock),
        isActive:     p.is_active,
      })),
    decants: (data.decants ?? [])
      .sort((a, b) => Number(a.size_ml) - Number(b.size_ml))
      .map(d => ({
        id:       d.id,
        sizeMl:   String(d.size_ml),
        price:    String(d.price),
        stock:    String(d.stock),
        isActive: d.is_active,
      })),
    notes: (data.fragrance_notes ?? []).map(n => ({
      noteId:   n.note_id,
      noteName: n.notes?.name ?? '',
      layer:    n.layer,
    })),
  };
}

export async function fetchBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, name, family')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createNote(name) {
  const { data, error } = await supabase
    .from('notes')
    .insert({ name: name.trim() })
    .select('id, name, family')
    .single();
  if (error) throw error;
  return data;
}

const slugifyBrand = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function createBrand(name, type = 'diseñador') {
  const slug = slugifyBrand(name.trim()) + '-' + Math.random().toString(36).slice(2, 5);
  const { data, error } = await supabase
    .from('brands')
    .insert({ name: name.trim(), slug, type })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// ── Image ─────────────────────────────────────────────────────
export async function uploadFragranceImage(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ── Write ─────────────────────────────────────────────────────
const slugifyStr = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function findOrCreateLine(brandId) {
  const { data } = await supabase
    .from('lines')
    .select('id')
    .eq('brand_id', brandId)
    .limit(1)
    .maybeSingle();
  if (data) return data.id;
  const { data: brand } = await supabase.from('brands').select('name').eq('id', brandId).single();
  const lineName = brand?.name ?? 'Default';
  const slug = slugifyStr(lineName) + '-' + Math.random().toString(36).slice(2, 5);
  const { data: line, error } = await supabase
    .from('lines').insert({ brand_id: brandId, name: lineName, slug }).select('id').single();
  if (error) throw error;
  return line.id;
}

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function upsertFragranceBasic(fragranceId, { name, lineId, gender, description, concentration, year, isActive, imageUrl }) {
  const payload = {
    name,
    line_id:        lineId,
    gender,
    description:    description || null,
    concentration:  concentration || null,
    year:           year ? Number(year) : null,
    is_active:      isActive,
    main_image_url: imageUrl || null,
  };

  if (fragranceId === 'new') {
    payload.slug = slugify(name) + '-' + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from('fragrances').insert(payload).select('id').single();
    if (error) throw error;
    return data.id;
  } else {
    const { error } = await supabase.from('fragrances').update(payload).eq('id', fragranceId);
    if (error) throw error;
    return fragranceId;
  }
}

export async function savePresentations(fragranceId, presentations, removedIds) {
  if (removedIds.length) {
    const { error } = await supabase.from('presentations')
      .update({ is_active: false }).in('id', removedIds);
    if (error) throw error;
  }
  if (!presentations.length) return;

  const toInsert = presentations.filter(p => !p.id).map(p => ({
    fragrance_id:  fragranceId,
    size_ml:       Number(p.sizeMl),
    price:         Number(p.price),
    compare_price: p.comparePrice ? Number(p.comparePrice) : null,
    stock:         Number(p.stock),
    is_active:     p.isActive,
  }));
  const toUpdate = presentations.filter(p => p.id).map(p => ({
    id:            p.id,
    fragrance_id:  fragranceId,
    size_ml:       Number(p.sizeMl),
    price:         Number(p.price),
    compare_price: p.comparePrice ? Number(p.comparePrice) : null,
    stock:         Number(p.stock),
    is_active:     p.isActive,
  }));

  if (toInsert.length) {
    const { error } = await supabase.from('presentations').insert(toInsert);
    if (error) throw error;
  }
  if (toUpdate.length) {
    const { error } = await supabase.from('presentations').upsert(toUpdate, { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function saveDecants(fragranceId, decants, removedIds) {
  if (removedIds.length) {
    const { error } = await supabase.from('decants')
      .update({ is_active: false }).in('id', removedIds);
    if (error) throw error;
  }
  if (!decants.length) return;

  const toInsert = decants.filter(d => !d.id).map(d => ({
    fragrance_id: fragranceId,
    size_ml:      Number(d.sizeMl),
    price:        Number(d.price),
    stock:        Number(d.stock),
    is_active:    d.isActive,
  }));
  const toUpdate = decants.filter(d => d.id).map(d => ({
    id:           d.id,
    fragrance_id: fragranceId,
    size_ml:      Number(d.sizeMl),
    price:        Number(d.price),
    stock:        Number(d.stock),
    is_active:    d.isActive,
  }));

  if (toInsert.length) {
    const { error } = await supabase.from('decants').insert(toInsert);
    if (error) throw error;
  }
  if (toUpdate.length) {
    const { error } = await supabase.from('decants').upsert(toUpdate, { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function saveFragranceNotes(fragranceId, notes) {
  const { error: delErr } = await supabase
    .from('fragrance_notes')
    .delete()
    .eq('fragrance_id', fragranceId);
  if (delErr) throw delErr;

  if (!notes.length) return;

  const seen = new Set();
  const rows = notes
    .filter(n => {
      const key = `${n.noteId}|${n.layer}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(n => ({
      fragrance_id: fragranceId,
      note_id:      n.noteId,
      layer:        n.layer,
      percentage:   null,
    }));

  const { error } = await supabase.from('fragrance_notes').insert(rows);
  if (error) throw error;
}

export { findOrCreateLine };
