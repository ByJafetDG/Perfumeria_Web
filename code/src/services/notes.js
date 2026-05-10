import { supabase } from '../lib/supabase';

export async function fetchPopularNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      id, name,
      fragrance_notes ( fragrance_id )
    `)
    .order('name');

  if (error) throw error;

  // Solo notas que tengan al menos una fragancia asociada
  return data
    .filter(n => n.fragrance_notes.length > 0)
    .map(n => ({ id: n.id, name: n.name }));
}
