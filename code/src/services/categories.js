import { supabase } from '../lib/supabase';

const LABEL = {
  nicho:      'Nicho',
  diseñador:  'Diseñador',
  arabe:      'Árabe',
  celebridad: 'Celebridad',
};

export async function fetchCategories() {
  const [{ data: enumValues, error }, { count }] = await Promise.all([
    // Lee todos los valores del enum brand_type directamente del sistema de PostgreSQL
    supabase.rpc('get_brand_type_enum'),
    supabase
      .from('decants')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  if (error) throw error;

  const categories = enumValues.map(({ value }) => ({
    id:    value,
    label: LABEL[value] ?? value,
    to:    `/catalog?type=${value}`,
  }));

  if (count > 0) {
    categories.push({ id: 'decants', label: 'Decants', to: '/catalog?type=decants' });
  }

  return categories;
}
