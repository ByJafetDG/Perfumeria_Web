import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { fetchAdminUsers } from '../../services/users';
import './Users.css';

const FILTER_TABS = [
  { id: 'all',    label: 'Todos'    },
  { id: 'admin',  label: 'Admins'   },
  { id: 'client', label: 'Clientes' },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });

const displayName = (u) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;

const initials = (u) => {
  if (u.first_name) return (u.first_name[0] + (u.last_name?.[0] ?? '')).toUpperCase();
  return u.email?.[0]?.toUpperCase() ?? '?';
};

// ── Role filter dropdown ──────────────────────────────────────
function RoleFilter({ tabId, setTabId }) {
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
    <div className="au-filters">
      <div className="au-drop" ref={ref}>
        <button
          type="button"
          className={`au-drop__trigger ${tabId !== 'all' ? 'au-drop__trigger--active' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          <span className="au-drop__label">Rol</span>
          <span className="au-drop__value">{active.label}</span>
          <svg className={`au-drop__arrow ${open ? 'au-drop__arrow--open' : ''}`}
            width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div className="au-drop__menu">
            {FILTER_TABS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`au-drop__item ${tabId === t.id ? 'au-drop__item--active' : ''}`}
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

// ── User card ─────────────────────────────────────────────────
function UserCard({ user }) {
  const name = displayName(user);
  const ini  = initials(user);

  return (
    <div className="au-card">
      <div className="au-card__avatar" data-admin={user.role === 'admin' ? 'true' : 'false'}>
        {ini}
      </div>

      <div className="au-card__info">
        <div className="au-card__top">
          <span className="au-card__name">{name}</span>
          <span className={`au-card__badge ${user.role === 'admin' ? 'au-card__badge--admin' : ''}`}>
            {user.role === 'admin' ? 'Admin' : 'Cliente'}
          </span>
        </div>
        <span className="au-card__email">{user.email}</span>
        {user.phone && <span className="au-card__phone">{user.phone}</span>}
      </div>

      <span className="au-card__date">{formatDate(user.created_at)}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');
  const [tabId,   setTabId]   = useState('all');

  const load = useCallback(() => {
    fetchAdminUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin-users-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = users.filter(u => {
    if (tabId === 'admin'  && u.role !== 'admin') return false;
    if (tabId === 'client' && u.role === 'admin') return false;
    if (q) {
      const name = displayName(u).toLowerCase();
      if (!name.includes(q) && !(u.email ?? '').toLowerCase().includes(q) && !(u.phone ?? '').includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="au-page">

      {/* Header */}
      <section className="au-header">
        <h1 className="au-header__title">Usuarios</h1>
        <div className="au-header__search-wrap">
          <span className="au-header__search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22"/>
            </svg>
          </span>
          <input
            className="au-header__search-input"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </section>

      {/* Filtro */}
      <RoleFilter tabId={tabId} setTabId={setTabId} />

      {/* Contador */}
      {!loading && (
        <p className="au-count">
          {filtered.length} {filtered.length === 1 ? 'usuario' : 'usuarios'}
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="au-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="au-card au-card--skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="au-empty">
          {query || tabId !== 'all' ? 'Sin resultados para los filtros actuales.' : 'Sin usuarios aún.'}
        </p>
      ) : (
        <div className="au-list">
          {filtered.map(u => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}

    </div>
  );
}
