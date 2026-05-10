import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { fetchUserProfile, fetchActiveOrder, fetchOrderHistory, updateUserProfile } from '../../services/user';
import './Account.css';

// Rangos por rol (staff/admin fijos)
const ROLE_RANKS = {
  staff: { label: 'STAFF',          className: '' },
  admin: { label: 'ADMINISTRADOR',  className: '' },
};

// Rangos de cliente por número de órdenes
function getCustomerRank(orderCount) {
  if (orderCount >= 25) return { label: 'MAGNATE',     className: 'account-profile__rank--elite' };
  if (orderCount >= 12) return { label: 'CONOCEDOR',   className: 'account-profile__rank--maestro' };
  if (orderCount >= 6)  return { label: 'NOVATO',      className: 'account-profile__rank--conocedor' };
  if (orderCount >= 1)  return { label: 'EXPLORADOR',  className: '' };
  return null; // 0 órdenes: sin chip
}

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  // Quitar prefijo 506 si ya viene con él
  const local = digits.startsWith('506') && digits.length === 11
    ? digits.slice(3)
    : digits;
  if (local.length === 8) {
    return `+506 ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return raw; // fallback sin modificar
}

const PhoneIconSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

function EditProfileModal({ profile, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName,  setLastName]  = useState(profile?.last_name  ?? '');
  const [phone,     setPhone]     = useState(profile?.phone      ?? '');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const lastUpdate = profile?.profile_updated_at ? new Date(profile.profile_updated_at) : null;
  const daysSince  = lastUpdate ? (Date.now() - lastUpdate.getTime()) / 86_400_000 : null;
  const daysLeft   = daysSince !== null && daysSince < 30 ? Math.ceil(30 - daysSince) : null;
  const nextDate   = lastUpdate && daysLeft
    ? lastUpdate.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  async function handleSave() {
    if (!firstName.trim()) { setError('El nombre es requerido.'); return; }
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(profile.id, {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim(),
      });
      onSaved();
    } catch (err) {
      if (err.message?.startsWith('COOLDOWN:')) {
        const until = new Date(err.message.split(':')[1]);
        setError(`Solo puedes actualizar tu perfil una vez al mes. Próximo cambio disponible: ${until.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}.`);
      } else {
        setError(err.message || 'Error al guardar. Intenta de nuevo.');
      }
      setSaving(false);
    }
  }

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-sheet" onClick={e => e.stopPropagation()}>
        <div className="ep-sheet__header">
          <span className="ep-sheet__title">Editar perfil</span>
          <button className="ep-sheet__close" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
        </div>

        <div className="ep-warn">
          <WarnIcon />
          <span>Solo puedes modificar tu perfil <strong>una vez al mes</strong>.
            {nextDate && ` Último cambio: ${nextDate}.`}
          </span>
        </div>

        <div className="ep-fields">
          <label className="ep-field">
            <span className="ep-field__label">Nombre</span>
            <input className="ep-field__input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nombre" />
          </label>
          <label className="ep-field">
            <span className="ep-field__label">Apellido</span>
            <input className="ep-field__input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Apellido" />
          </label>
          <label className="ep-field">
            <span className="ep-field__label">Teléfono</span>
            <input className="ep-field__input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="88889999" inputMode="tel" />
          </label>
        </div>

        {error && <p className="ep-error">{error}</p>}

        <button
          className={`ep-save-btn ${saving ? 'ep-save-btn--loading' : ''}`}
          onClick={handleSave}
          disabled={saving || daysLeft !== null}
        >
          {saving ? 'Guardando…' : daysLeft !== null ? `Disponible en ${daysLeft} días` : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function UserProfileHeader({ profile, orderCount, onEdit }) {
  const initial = profile?.first_name?.[0]?.toUpperCase() ?? '?';
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  const rank = profile?.role && ROLE_RANKS[profile.role]
    ? ROLE_RANKS[profile.role]
    : getCustomerRank(orderCount ?? 0);

  return (
    <div className="account-profile">
      <div className="account-profile__avatar">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={fullName} className="account-profile__avatar-img" />
        ) : (
          <span className="account-profile__initial">{initial}</span>
        )}
      </div>
      {rank && (
        <span className={`account-profile__rank ${rank.className ?? ''}`}>
          {rank.label}
        </span>
      )}
      <div className="account-profile__name-row">
        <p className="account-profile__name">{fullName}</p>
        <button className="account-profile__edit-btn" onClick={onEdit} aria-label="Editar perfil">
          <EditIcon />
        </button>
      </div>
      {profile?.phone && (
        <div className="account-profile__phone">
          <PhoneIconSmall />
          <span>{formatPhone(profile.phone)}</span>
        </div>
      )}
    </div>
  );
}

const SHORTCUTS = [
  {
    key: 'orders',
    label: 'Rastrear Pedido',
    to: '/orders',
    icon: (
      <svg width="22" height="24" viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 7L11 2L21 7V17L11 22L1 17V7Z" stroke="#F2CA50" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M11 2V22M1 7L11 12L21 7" stroke="#F2CA50" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'addresses',
    label: 'Direcciones',
    to: '/addresses',
    icon: (
      <svg width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 1C5.13 1 2 4.13 2 8C2 13.25 9 23 9 23C9 23 16 13.25 16 8C16 4.13 12.87 1 9 1Z" stroke="#F2CA50" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="9" cy="8" r="2.5" stroke="#F2CA50" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

/* ── Marquee label for timeline stages ──────────────────────── */
function OstLabel({ text, className }) {
  const wrapRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setOverflows(el.scrollWidth > el.offsetWidth + 1);
  }, [text]);

  return (
    <div className={`ost__label-wrap ${className ?? ''}`} ref={wrapRef}>
      {overflows ? (
        <div className="ost__label-track">
          <span className="ost__label">{text}</span>
          <span className="ost__label" aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span className="ost__label">{text}</span>
      )}
    </div>
  );
}

/* ── Check icon (for completed stages) ──────────────────────── */
const CheckIcon = ({ color = '#3C2F00' }) => (
  <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
    <polyline points="1,5 5,9 12,1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const STAGES = [
  {
    key: 'payment',
    label: 'Pago',
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.6"/>
        <path d="M2 10h20" stroke={color} strokeWidth="1.6"/>
        <path d="M6 15h4" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'processing',
    label: 'Procesando',
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.6"/>
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
          stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'packing',
    label: 'Empacando',
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 9h18v13H3zM3 9l3-6h12l3 6" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M9 9v4h6V9" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'in_transit',
    label: 'En tránsito',
    icon: (color) => (
      <svg width="18" height="14" viewBox="0 0 24 18" fill="none">
        <rect x="1" y="1" width="15" height="12" rx="1" stroke={color} strokeWidth="1.6"/>
        <path d="M16 5h4l3 5v5h-7V5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
        <circle cx="5.5" cy="15.5" r="2" stroke={color} strokeWidth="1.4"/>
        <circle cx="18.5" cy="15.5" r="2" stroke={color} strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    key: 'delivered',
    label: 'Entregado',
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 12l2-2 4 4 10-10 2 2-12 12z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Mapea los statuses reales de la BD a los índices del timeline
const STATUS_INDEX = {
  pending:   0,  // Pago current (tarjeta procesando o SINPE sin verificar)
  confirmed: 1,  // Pago ✓, Procesando current
  paid:      1,  // Pago ✓, Procesando current
  shipped:   3,  // Pago ✓, Procesando ✓, Empacando ✓, En tránsito current
  delivered: 4,  // Todo ✓
};

export function OrderStatusTimeline({ order }) {
  const navigate = useNavigate();

  if (!order) {
    return (
      <div className="ost">
        <div className="ost__header">
          <h3 className="ost__title">Orden activa</h3>
        </div>
        <div className="ost__empty">
          <p className="ost__empty-text">No tienes órdenes activas.</p>
          <button className="ost__empty-cta" onClick={() => navigate('/catalog')}>
            Explorar catálogo
          </button>
        </div>
      </div>
    );
  }

  const currentIdx  = STATUS_INDEX[order.status] ?? 0;
  const isSinpePending =
    order.status === 'pending' &&
    (order.payment_status === 'pending' || order.payment_provider === 'sinpe');
  const displayNumber = order.order_number
    ? `#${order.order_number}`
    : `#${String(order.id).slice(0, 8).toUpperCase()}`;

  return (
    <div className="ost">
      <div className="ost__header">
        <h3 className="ost__title">Orden más reciente</h3>
        <span className="ost__number">{displayNumber}</span>
      </div>

      <div className="ost__scroll-wrap">
        <div className="ost__track" key={currentIdx}>
          <div className="ost__connector" />
          {STAGES.map((stage, i) => {
            const isDone    = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isPending = i > currentIdx;
            const sublabel  = isCurrent && stage.key === 'payment' && isSinpePending
              ? 'Verificando'
              : null;

            return (
              <div
                key={stage.key}
                className={[
                  'ost__stage',
                  isDone    ? 'ost__stage--done'    : '',
                  isCurrent ? 'ost__stage--current' : '',
                  isPending ? 'ost__stage--pending' : '',
                ].join(' ')}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="ost__bubble">
                  {isDone
                    ? <CheckIcon color="#3C2F00" />
                    : stage.icon(isCurrent ? '#F2CA50' : '#D0C5AF')
                  }
                </div>
                <OstLabel
                  text={stage.label}
                  className={
                    isDone    ? 'ost__label-wrap--done'    :
                    isCurrent ? 'ost__label-wrap--current' :
                                'ost__label-wrap--pending'
                  }
                />
                {sublabel && <span className="ost__sublabel">{sublabel}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Order history ───────────────────────────────────────────── */
const STATUS_CHIP = {
  pending:   { label: 'PENDIENTE',   bg: 'rgba(113,63,18,0.2)',  border: 'rgba(234,179,8,0.3)',   color: '#EAB308' },
  confirmed: { label: 'CONFIRMADO',  bg: 'rgba(113,63,18,0.2)',  border: 'rgba(234,179,8,0.3)',   color: '#EAB308' },
  paid:      { label: 'PAGADO',      bg: 'rgba(113,63,18,0.2)',  border: 'rgba(234,179,8,0.3)',   color: '#EAB308' },
  shipped:   { label: 'EN RUTA',     bg: 'rgba(30,58,138,0.2)',  border: 'rgba(96,165,250,0.3)',  color: '#60A5FA' },
  delivered: { label: 'ENTREGADO',   bg: 'rgba(20,83,45,0.2)',   border: 'rgba(34,197,94,0.3)',   color: '#22C55E' },
  cancelled: { label: 'CANCELADO',   bg: 'rgba(80,20,20,0.2)',   border: 'rgba(239,68,68,0.3)',   color: '#F87171' },
  refunded:  { label: 'REEMBOLSADO', bg: 'rgba(80,20,20,0.2)',   border: 'rgba(239,68,68,0.3)',   color: '#F87171' },
};

const formatPrice = p => `₡${Number(p).toLocaleString('es-CR')}`;

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className="cm-sheet" onClick={e => e.stopPropagation()}>
        <p className="cm-title">{title}</p>
        <p className="cm-message">{message}</p>
        <div className="cm-actions">
          <button className="cm-btn cm-btn--cancel" onClick={onCancel}>Cancelar</button>
          <button className={`cm-btn ${confirmClass ?? ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const RetryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
  </svg>
);

function OrderCard({ order, onRefresh }) {
  const [open,      setOpen]      = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const [retrying,  setRetrying]  = useState(false);
  const [confirm,   setConfirm]   = useState(null); // { type: 'delete' | 'retry' }
  const nameRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  const items      = order.order_items ?? [];
  const fragrances = [...new Set(items.map(i => i.fragrance_name).filter(Boolean))];
  const totalItems = items.reduce((s, i) => s + (i.quantity ?? 1), 0);
  const hasMultiple = fragrances.length > 1;
  const collapsedText = fragrances.length > 0 ? fragrances.join(' · ') : '—';
  const chip = STATUS_CHIP[order.status] ?? STATUS_CHIP.pending;
  const date = new Date(order.created_at)
    .toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
  const displayNumber = order.order_number
    ? `#${order.order_number}`
    : `#${String(order.id).slice(0, 8).toUpperCase()}`;

  const canDelete = order.status === 'pending' || order.status === 'cancelled';
  const canRetry  = order.status === 'cancelled' && order.payment_provider === 'tilopay';

  useEffect(() => {
    if (nameRef.current && !open) {
      setOverflows(nameRef.current.scrollWidth > nameRef.current.offsetWidth);
    }
  }, [collapsedText, open]);

  function handleDelete() {
    setConfirm(null);
    if (deleting) return;
    setRemoving(true); // play animation; executeDelete fires on animationEnd
  }

  async function executeDelete() {
    setDeleting(true);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token;
      if (!token) { setRemoving(false); setDeleting(false); return; }
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      await fetch(`${apiUrl}/orders/${order.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRefresh?.();
    } catch (_) {
      setRemoving(false);
      setDeleting(false);
    }
  }

  async function handleRetry() {
    setConfirm(null);
    if (retrying) return;
    setRetrying(true);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token;
      if (!token) { setRetrying(false); return; }
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res  = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.paymentUrl) throw new Error(data?.error ?? 'Error');
      localStorage.setItem('tilopay_pending', JSON.stringify({
        orderId: order.id,
        orderNumber: order.order_number,
      }));
      window.location.href = data.paymentUrl;
    } catch (_) {
      setRetrying(false);
    }
  }

  return (
    <div
      className={`oh-card ${removing ? 'oh-card--removing' : ''}`}
      onAnimationEnd={removing ? executeDelete : undefined}
    >
      {/* Top */}
      <div className="oh-card__top">
        <div className="oh-card__left">
          <span className="oh-card__date">{date} · {displayNumber}</span>

          <div className="oh-card__name-row">
            {open && hasMultiple ? (
              <div className="oh-card__names-list">
                {fragrances.map((name, i) => (
                  <span key={i} className="oh-card__name">{name}</span>
                ))}
              </div>
            ) : (
              <div className="oh-card__name-wrap" ref={nameRef}>
                {overflows ? (
                  <div className="oh-card__name-track">
                    <span className="oh-card__name">{collapsedText}</span>
                    <span className="oh-card__name" aria-hidden="true">{collapsedText}</span>
                  </div>
                ) : (
                  <span className="oh-card__name">{collapsedText}</span>
                )}
              </div>
            )}

            {hasMultiple && (
              <button
                className={`oh-card__chevron ${open ? 'oh-card__chevron--open' : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Contraer' : 'Expandir'}
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="#99907C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <span
          className="oh-card__chip"
          style={{ background: chip.bg, border: `1px solid ${chip.border}`, color: chip.color }}
        >
          {chip.label}
        </span>
      </div>

      {/* Bottom */}
      <div className="oh-card__bottom">
        <span className="oh-card__count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
        <span className="oh-card__total">{formatPrice(order.total)}</span>
      </div>

      {/* Actions */}
      {(canDelete || canRetry) && (
        <div className="oh-card__actions">
          {canRetry && (
            <button
              className={`oh-card__action-btn oh-card__action-btn--retry ${retrying ? 'oh-card__action-btn--loading' : ''}`}
              onClick={() => setConfirm({ type: 'retry' })}
              disabled={retrying || deleting}
            >
              <RetryIcon />
              {retrying ? 'Redirigiendo…' : 'Reintentar pago'}
            </button>
          )}
          {canDelete && (
            <button
              className={`oh-card__action-btn oh-card__action-btn--delete ${deleting ? 'oh-card__action-btn--loading' : ''}`}
              onClick={() => setConfirm({ type: 'delete' })}
              disabled={deleting || retrying}
              aria-label="Eliminar orden"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}

      {confirm?.type === 'retry' && (
        <ConfirmModal
          title="Reintentar pago"
          message={`¿Deseas reintentar el pago de la orden ${displayNumber}? Serás redirigido a TiloPay.`}
          confirmLabel="Sí, reintentar"
          confirmClass="cm-btn--confirm"
          onConfirm={handleRetry}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmModal
          title="Eliminar orden"
          message={`¿Eliminar la orden ${displayNumber}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmClass="cm-btn--danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function OrderHistory({ orders, onRefresh }) {
  return (
    <div className="oh">
      <h3 className="oh__title">Historial de órdenes</h3>
      {orders.length === 0 ? (
        <p className="oh__empty">Aún no has realizado ninguna orden.</p>
      ) : (
        <div className="oh__list">
          {orders.map(order => <OrderCard key={order.id} order={order} onRefresh={onRefresh} />)}
        </div>
      )}
    </div>
  );
}

function SignOutSection() {
  const { signOut } = useAuth();
  const navigate    = useNavigate();

  async function handleSignOut() {
    try { await signOut(); } catch (_) {}
    navigate('/login');
  }

  return (
    <div className="account-signout">
      <button className="account-signout__btn" onClick={handleSignOut}>
        Cerrar Sesión
      </button>
    </div>
  );
}

function BentoGridShortcuts({ role }) {
  const navigate = useNavigate();
  const isPrivileged = role === 'admin' || role === 'staff';

  return (
    <div className="bento-grid">
      {SHORTCUTS.map(({ key, label, to, icon }) => (
        <button key={key} className="bento-cell" onClick={() => navigate(to)}>
          <div className="bento-cell__icon">{icon}</div>
          <span className="bento-cell__label">{label}</span>
        </button>
      ))}
      {isPrivileged && (
        <button className="bento-cell bento-cell--admin" onClick={() => navigate('/admin')}>
          <div className="bento-cell__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <span className="bento-cell__label">Administración</span>
        </button>
      )}
    </div>
  );
}

export default function Account() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile,     setProfile]     = useState(null);
  const [activeOrder, setActiveOrder] = useState(undefined);
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editOpen,    setEditOpen]    = useState(false);

  // Redirige al login si el auth terminó y no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/account', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const refetchOrders = useCallback(() => {
    if (!user) return;
    Promise.all([
      fetchActiveOrder(user.id),
      fetchOrderHistory(user.id),
    ]).then(([active, history]) => {
      setActiveOrder(active);
      setOrders(history);
    }).catch(console.error);
  }, [user]);

  // Carga inicial
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchUserProfile(user.id),
      fetchActiveOrder(user.id),
      fetchOrderHistory(user.id),
    ])
      .then(([prof, active, history]) => {
        setProfile(prof);
        setActiveOrder(active);
        setOrders(history);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Suscripción realtime a orders + order_items
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, refetchOrders)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
      }, refetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refetchOrders]);

  if (loading) {
    return <div className="account-page account-page--loading" />;
  }

  async function handleProfileSaved() {
    setEditOpen(false);
    try {
      const prof = await fetchUserProfile(user.id);
      setProfile(prof);
    } catch (_) {}
  }

  return (
    <div className="account-page">
      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
      <div className="account-page__inner">
        <UserProfileHeader
          profile={profile}
          orderCount={orders.filter(o => ['paid','confirmed','shipped','delivered'].includes(o.status)).length}
          onEdit={() => setEditOpen(true)}
        />
        <BentoGridShortcuts role={profile?.role} />
        <OrderStatusTimeline order={activeOrder} />
        <OrderHistory orders={orders} onRefresh={refetchOrders} />
        <SignOutSection />
      </div>
    </div>
  );
}
