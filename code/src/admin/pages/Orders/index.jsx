import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { fetchAdminOrders } from '../../services/orders';
import './Orders.css';

// â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  color: '#F2CA50', bg: '#51452D',              border: '#F2CA50' },
  confirmed: { label: 'Confirmado', color: '#F2CA50', bg: '#51452D',              border: '#F2CA50' },
  paid:      { label: 'Pagado',     color: '#F2CA50', bg: '#51452D',              border: '#F2CA50' },
  shipped:   { label: 'En camino',  color: '#60A5FA', bg: 'rgba(30,58,138,0.4)',  border: '#60A5FA' },
  delivered: { label: 'Entregado',  color: '#4ADE80', bg: 'rgba(20,83,45,0.4)',   border: '#4ADE80' },
  cancelled: { label: 'Cancelado',  color: '#FFB4AB', bg: '#93000A',              border: '#FFB4AB' },
  refunded:  { label: 'Reembolso',  color: '#FFB4AB', bg: '#93000A',              border: '#FFB4AB' },
};

const FILTER_TABS = [
  { id: 'all',       label: 'Todos',     statuses: null },
  { id: 'pending',   label: 'Pendiente', statuses: ['pending', 'confirmed'] },
  { id: 'paid',      label: 'Pagado',    statuses: ['paid'] },
  { id: 'shipped',   label: 'En camino', statuses: ['shipped'] },
  { id: 'delivered', label: 'Entregado', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Cancelado', statuses: ['cancelled', 'refunded'] },
];


const formatPrice = (n) =>
  '¢' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');


const formatDateShort = (iso) =>
  new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });

const customerName = (users) => {
  if (!users) return 'Cliente desconocido';
  const { first_name, last_name } = users;
  return [first_name, last_name].filter(Boolean).join(' ') || users.email || 'Sin nombre';
};

// â"€â"€ Status badge â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#D0C5AF', bg: 'rgba(77,70,53,0.3)' };
  return (
    <span className="ao-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

// â"€â"€ Order card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function OrderCard({ order, onClick }) {
  const cfg    = STATUS_CONFIG[order.status] ?? {};
  const name   = customerName(order.users);
  const border = cfg.border ?? '#4D4635';

  return (
    <button
      type="button"
      className="ao-card"
      style={{ borderLeftColor: border }}
      onClick={() => onClick(order)}
    >
      <div className="ao-card__top">
        <div className="ao-card__info">
          <span className="ao-card__label">Orden</span>
          <span className="ao-card__number">#{order.order_number}</span>
          <span className="ao-card__customer">{name}</span>
        </div>
        <div className="ao-card__right">
          <StatusBadge status={order.status} />
          <span className="ao-card__total">{formatPrice(order.total)}</span>
        </div>
      </div>
      <div className="ao-card__bottom">
        <span className="ao-card__date">{formatDateShort(order.created_at)}</span>
        <span className="ao-card__ver">
          Ver detalle
          <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
            <path d="M1 1l3 3-3 3" stroke="currentColor" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </button>
  );
}

// â"€â"€ Status filter dropdown â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function StatusFilter({ tabId, setTabId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const active = FILTER_TABS.find(t => t.id === tabId) ?? FILTER_TABS[0];

  return (
    <div className="ao-filters">
      <div className="ao-drop" ref={ref}>
        <button
          type="button"
          className={`ao-drop__trigger ${tabId !== 'all' ? 'ao-drop__trigger--active' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          <span className="ao-drop__label">Estado</span>
          <span className="ao-drop__value">{active.label}</span>
          <svg className={`ao-drop__arrow ${open ? 'ao-drop__arrow--open' : ''}`}
            width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div className="ao-drop__menu">
            {FILTER_TABS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`ao-drop__item ${tabId === t.id ? 'ao-drop__item--active' : ''}`}
                onClick={() => { setTabId(t.id); setOpen(false); }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');
  const [tabId,   setTabId]   = useState('all');

  const load = useCallback(() => {
    fetchAdminOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime - orders is already in the supabase_realtime publication
  useEffect(() => {
    const ch = supabase
      .channel('admin-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  // Filter
  const tab = FILTER_TABS.find(t => t.id === tabId) ?? FILTER_TABS[0];
  const q   = query.trim().toLowerCase();
  const filtered = orders.filter(o => {
    if (tab.statuses && !tab.statuses.includes(o.status)) return false;
    if (q) {
      const name = customerName(o.users).toLowerCase();
      if (!o.order_number.toLowerCase().includes(q) && !name.includes(q) && !(o.users?.email ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="ao-page">

      {/* Header */}
      <section className="ao-header">
        <h1 className="ao-header__title">Órdenes</h1>
        <div className="ao-header__search-wrap">
          <span className="ao-header__search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22"/>
            </svg>
          </span>
          <input
            className="ao-header__search-input"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar orden, cliente..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </section>

      {/* Estado filter */}
      <StatusFilter tabId={tabId} setTabId={setTabId} />

      {/* List */}
      {loading ? (
        <div className="ao-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ao-card ao-card--skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="ao-empty">
          {query || tabId !== 'all' ? 'Sin resultados para los filtros actuales.' : 'Sin órdenes aún.'}
        </p>
      ) : (
        <div className="ao-list">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={o => navigate(`/admin/orders/${o.id}`)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
