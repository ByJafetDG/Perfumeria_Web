import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { searchFragrances, fetchTrendingFragrances } from '../../services/products';
import { fetchPopularNotes } from '../../services/notes';
import ProductCard from '../../components/ui/ProductCard/ProductCard';
import './Search.css';

const TAGLINES = [
  'El paisaje olfativo del momento',
  'Las fragancias que muchos desean',
  'Lo que está en boca de todos ahora',
  'Las esencias más buscadas esta temporada',
  'Descubre lo que está marcando tendencia',
];

const LS_KEY = 'perfumero_recent_searches';
const MAX_RECENT = 10;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}

function saveRecent(term) {
  const prev = getRecent().filter(t => t.toLowerCase() !== term.toLowerCase());
  localStorage.setItem(LS_KEY, JSON.stringify([term, ...prev].slice(0, MAX_RECENT)));
}

function clearRecent() {
  localStorage.removeItem(LS_KEY);
}

export default function Search() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent]       = useState(getRecent);
  const [notes, setNotes]         = useState([]);
  const [trending, setTrending]   = useState([]);
  const [tagline]                 = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchPopularNotes().then(setNotes).catch(console.error);
    fetchTrendingFragrances().then(setTrending).catch(console.error);
  }, []);

  const runSearch = useCallback(async (term) => {
    const q = term.trim();
    if (q.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchFragrances(q);
      setResults(data);
      saveRecent(q);
      setRecent(getRecent());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleRecent = (term) => {
    setQuery(term);
    runSearch(term);
  };

  const handleNote = (name) => {
    setQuery(name);
    runSearch(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearRecent = () => {
    clearRecent();
    setRecent([]);
  };

  return (
    <div className="search-page">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="search-hero">
        <h1 className="search-hero__title">
          <span className="search-hero__title--light">Encuentra tu</span>
          {' '}
          <span className="search-hero__title--accent">esencia</span>
        </h1>

        <form className="search-hero__form" onSubmit={handleSubmit}>
          <div className="search-hero__input-wrap">
            <input
              ref={inputRef}
              className="search-hero__input"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Fragancia, marca, notas…"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="search-hero__submit" aria-label="Buscar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="22" y2="22" />
              </svg>
            </button>
          </div>
        </form>

        {/* Búsquedas recientes */}
        {recent.length > 0 && !searched && (
          <div className="search-recent">
            <div className="search-recent__header">
              <span className="search-recent__label">Búsquedas recientes</span>
              <button className="search-recent__clear" onClick={handleClearRecent} aria-label="Borrar historial">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
            <div className="search-recent__track">
              {recent.map((term, i) => (
                <button key={i} className="search-recent__chip" onClick={() => handleRecent(term)}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Notas Populares ──────────────────────────────── */}
      {!searched && notes.length > 0 && (
        <section className="notes-section">
          <div className="notes-section__header">
            <h2 className="notes-section__title">Notas Populares</h2>
            <div className="notes-section__divider" />
          </div>

          <div className="notes-section__grid">
            {notes.map(note => (
              <button
                key={note.id}
                className="notes-section__chip"
                onClick={() => handleNote(note.name)}
              >
                {note.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending Now ─────────────────────────────────── */}
      {!searched && trending.length > 0 && (
        <section className="trending-section">
          <div className="trending-section__header">
            <div className="trending-section__titles">
              <h2 className="trending-section__title">Tendencias</h2>
              <p className="trending-section__tagline">{tagline}</p>
            </div>
            <Link to="/catalog" className="trending-section__link">
              VER CATÁLOGO
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="trending-section__list">
            {trending.map(f => (
              <Link key={f.id} to={`/product/${f.slug}`} className="trending-card">
                <div className="trending-card__image-wrap">
                  <img src={f.imageUrl} alt={f.name} className="trending-card__img" />
                  <div className="trending-card__overlay" />
                </div>
                <div className="trending-card__body">
                  <span className="trending-card__brand">{f.brand}</span>
                  <span className="trending-card__name">{f.name}</span>
                  {f.notes && (
                    <div className="trending-card__notes-wrap">
                      <div className="trending-card__notes-track">
                        <span className="trending-card__notes">{f.notes}</span>
                        <span className="trending-card__notes" aria-hidden="true">{f.notes}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Resultados ───────────────────────────────────── */}
      {searched && (
        <section className="search-results">
          {loading ? (
            <div className="search-results__grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="search-results__skeleton" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="search-results__empty">
              Sin resultados para <em>"{query}"</em>
            </p>
          ) : (
            <>
              <p className="search-results__count">
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <div className="search-results__grid">
                {results.map(f => (
                  <ProductCard key={f.id} product={f} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

    </div>
  );
}
