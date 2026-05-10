import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchInventoryItems, deleteFragrance } from '../../services/inventory';
import './Products.css';

const GENDER_LABEL = { masculino: 'Hombre', femenino: 'Mujer', unisex: 'Unisex' };
const GENDER_OPTS  = [
  { id: null,        label: 'Todos'  },
  { id: 'masculino', label: 'Hombre' },
  { id: 'femenino',  label: 'Mujer'  },
  { id: 'unisex',    label: 'Unisex' },
];
const STOCK_OPTS = [
  { id: null,   label: 'Todos'      },
  { id: 'low',  label: 'Stock bajo' },
  { id: 'zero', label: 'Sin stock'  },
];

const formatPrice = (n) =>
  '¢' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ── FilterDropdown ────────────────────────────────────────────
function FilterDropdown({ label, activeLabel, options, value, onChange, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div className="inv-drop" ref={ref}>
      <button
        className={`inv-drop__trigger ${isActive ? 'inv-drop__trigger--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="inv-drop__label">{label}</span>
        <span className="inv-drop__value">{activeLabel}</span>
        <svg className={`inv-drop__arrow ${open ? 'inv-drop__arrow--open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="inv-drop__menu">
          {options.map(opt => (
            <button
              key={opt.id ?? 'all'}
              className={`inv-drop__item ${value === opt.id ? 'inv-drop__item--active' : ''}`}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape' && !loading) onCancel(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [loading, onCancel]);

  return (
    <div className="inv-modal-overlay" onClick={() => { if (!loading) onCancel(); }}>
      <div className="inv-modal-sheet" onClick={e => e.stopPropagation()}>
        <p className="inv-modal-title">{title}</p>
        <p className="inv-modal-message">{message}</p>
        <div className="inv-modal-actions">
          <button className="inv-modal-btn inv-modal-btn--cancel" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="inv-modal-btn inv-modal-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── InventoryCard ─────────────────────────────────────────────
function InventoryCard({ item, onDeleteRequest }) {
  const navigate = useNavigate();

  const noPres  = item.presId === null;
  const isLow   = !noPres && item.stock > 0 && item.stock <= 5;
  const isZero  = !noPres && item.stock === 0;
  const isWarn  = isLow || isZero || noPres;
  const stockColor = noPres ? '#9CA3AF' : isZero ? '#EF4444' : isLow ? '#FFB4AB' : '#F2CA50';

  return (
    <div className={`inv-item ${isWarn ? 'inv-item--low' : ''}`}>

      {/* ── Info row ── */}
      <div className="inv-item__row">

        <div className="inv-item__img-wrap">
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.name} className="inv-item__img" />
          )}
          <div className="inv-item__img-gradient" />
        </div>

        <div className="inv-item__info">
          <span className="inv-item__brand">{item.brand}</span>
          <h3 className="inv-item__name">{item.name}</h3>

          <div className="inv-item__meta">
            <span className="inv-item__chip">{GENDER_LABEL[item.gender] ?? item.gender}</span>
            {item.sizeMl != null
              ? <span className="inv-item__size">{item.sizeMl} ml</span>
              : <span className="inv-item__size inv-item__size--warn">Sin presentaciones</span>
            }
          </div>

          <div className="inv-item__stats">
            <div className="inv-item__stat">
              <span className="inv-item__stat-label">Stock</span>
              <div className="inv-item__stat-val-row">
                <span className="inv-item__stat-val" style={{ color: stockColor }}>
                  {noPres ? '—' : item.stock}
                </span>
                {isWarn && (
                  <svg width="13" height="11" viewBox="0 0 24 22" fill="none" style={{ color: stockColor }}>
                    <path d="M12 2L22 20H2L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    <line x1="12" y1="9" x2="12" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="12" cy="17" r="0.8" fill="currentColor"/>
                  </svg>
                )}
              </div>
            </div>
            <div className="inv-item__stat inv-item__stat--right">
              <span className="inv-item__stat-label">Precio</span>
              <span className="inv-item__price">{item.price != null ? formatPrice(item.price) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="inv-item__action">
        <button
          className="inv-item__action-btn inv-item__action-btn--danger"
          onClick={() => onDeleteRequest(item)}
          type="button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
          <span className="inv-item__action-label">Eliminar</span>
        </button>

        <button
          className="inv-item__action-btn inv-item__action-btn--edit"
          onClick={() => navigate(`/admin/products/${item.fragranceId}`)}
          type="button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className="inv-item__action-label">Editar</span>
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminInventory() {
  const navigate = useNavigate();
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [query, setQuery]             = useState('');
  const [genderF, setGenderF]         = useState(null);
  const [stockF, setStockF]           = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => {
    fetchInventoryItems()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteRequest = (item) => {
    setDeleteTarget({ fragranceId: item.fragranceId, name: item.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFragrance(deleteTarget.fragranceId);
      setItems(prev => prev.filter(i => i.fragranceId !== deleteTarget.fragranceId));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = items.filter(item => {
    if (genderF && item.gender !== genderF) return false;
    if (stockF === 'low'  && !(item.stock > 0 && item.stock <= 5)) return false;
    if (stockF === 'zero' && item.stock !== 0) return false;
    if (q && !item.name.toLowerCase().includes(q) && !item.brand.toLowerCase().includes(q)) return false;
    return true;
  });

  const genderLabel = GENDER_OPTS.find(o => o.id === genderF)?.label ?? 'Todos';
  const stockLabel  = STOCK_OPTS.find(o => o.id === stockF)?.label  ?? 'Todos';

  return (
    <div className="admin-inventory">

      <section className="inv-header">
        <h1 className="inv-header__title">Inventario</h1>
        <div className="inv-header__search-wrap">
          <span className="inv-header__search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22"/>
            </svg>
          </span>
          <input
            className="inv-header__search-input"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar fragancias, marcas..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </section>

      <section className="inv-filters">
        <FilterDropdown
          label="Género"
          activeLabel={genderLabel}
          options={GENDER_OPTS}
          value={genderF}
          onChange={setGenderF}
          isActive={!!genderF}
        />
        <FilterDropdown
          label="Stock"
          activeLabel={stockLabel}
          options={STOCK_OPTS}
          value={stockF}
          onChange={setStockF}
          isActive={!!stockF}
        />
      </section>

      {loading ? (
        <div className="inv-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="inv-item inv-item--skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="inv-empty">
          {query || genderF || stockF ? 'Sin resultados para los filtros actuales' : 'Sin fragancias'}
        </p>
      ) : (
        <div className="inv-list">
          {filtered.map(item => (
            <InventoryCard
              key={item.presId ?? `frag-${item.fragranceId}`}
              item={item}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* ── FAB Agregar ── */}
      <button
        className="inv-fab"
        onClick={() => navigate('/admin/products/new')}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span>Agregar Fragancia</span>
      </button>

      {deleteTarget && (
        <ConfirmModal
          title={`¿Eliminar ${deleteTarget.name}?`}
          message="La fragancia se desactivará y dejará de aparecer en la tienda e inventario. El historial de órdenes se conserva."
          onConfirm={handleDeleteConfirm}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          loading={deleting}
        />
      )}

    </div>
  );
}
