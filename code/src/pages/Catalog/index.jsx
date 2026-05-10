import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchFragrances } from '../../services/products';
import CategoryScroll from '../../components/ui/CategoryScroll/CategoryScroll';
import ProductCard from '../../components/ui/ProductCard/ProductCard';
import './Catalog.css';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type   = searchParams.get('type')   || null;
  const gender = searchParams.get('gender') || null;
  const page   = parseInt(searchParams.get('page') || '1', 10);

  const [items, setItems]     = useState([]);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);

  // Keep latest filter values accessible inside the realtime callback
  const filtersRef = useRef({ type, gender, page });
  useEffect(() => { filtersRef.current = { type, gender, page }; }, [type, gender, page]);

  const loadCatalog = useCallback(({ type, gender, page }) => {
    fetchFragrances({ type, gender, page })
      .then(({ items, pages }) => { setItems(items); setPages(pages); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCatalog({ type, gender, page });
  }, [type, gender, page, loadCatalog]);

  // Realtime — silently refetch when fragrances change (new item or stock/price update)
  useEffect(() => {
    const channel = supabase
      .channel('catalog-fragrances-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fragrances' }, () => {
        loadCatalog(filtersRef.current);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentations' }, () => {
        loadCatalog(filtersRef.current);
      })
      .subscribe();

    // Separate channel for admin broadcasts (deactivations bypass RLS so
    // postgres_changes never reaches anon clients — broadcast does).
    const controlChannel = supabase
      .channel('catalog-control')
      .on('broadcast', { event: 'refetch' }, () => {
        loadCatalog(filtersRef.current);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(controlChannel);
    };
  }, [loadCatalog]);

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', p);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="catalog">
      {/* Título */}
      <div className="catalog__header">
        <h1 className="catalog__title">Catálogo</h1>
      </div>

      {/* Filtros */}
      <CategoryScroll />

      {/* Contenido */}
      <div className="catalog__body">
        {loading ? (
          <div className="catalog__grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="catalog__skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="catalog__empty">No hay fragancias en esta categoría aún.</p>
        ) : (
          <div className="catalog__grid">
            {items.map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}

        {/* Paginación — solo si hay más de una página */}
        {pages > 1 && (
          <div className="catalog__pagination">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`catalog__page-btn ${p === page ? 'catalog__page-btn--active' : ''}`}
                onClick={() => goToPage(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
