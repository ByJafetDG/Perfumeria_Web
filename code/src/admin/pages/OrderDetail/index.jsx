import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchOrderDetail, updateOrderStatus } from '../../services/orders';
import { getPromoLabel, PROMO_COLORS } from '../../../utils/promoUtils';
import './OrderDetail.css';

// ── Constants ─────────────────────────────────────────────────
const STATUS_STEPS = ['pending', 'confirmed', 'paid', 'shipped', 'delivered'];

const STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  paid:      'Pagado',
  shipped:   'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded:  'Reembolso',
};

const STATUS_COLORS = {
  pending:   '#F2CA50',
  confirmed: '#F2CA50',
  paid:      '#F2CA50',
  shipped:   '#60A5FA',
  delivered: '#4ADE80',
  cancelled: '#FFB4AB',
  refunded:  '#FFB4AB',
};

// Next actions an admin can take from each status
const NEXT_ACTIONS = {
  pending:   [{ status: 'confirmed', label: 'Confirmar orden',      color: 'gold'  }, { status: 'cancelled', label: 'Cancelar', color: 'danger' }],
  confirmed: [{ status: 'paid',      label: 'Marcar como pagado',   color: 'gold'  }, { status: 'cancelled', label: 'Cancelar', color: 'danger' }],
  paid:      [{ status: 'shipped',   label: 'Marcar como enviado',  color: 'blue', needsTracking: true }, { status: 'cancelled', label: 'Cancelar', color: 'danger' }],
  shipped:   [{ status: 'delivered', label: 'Marcar como entregado',color: 'green' }],
  delivered: [],
  cancelled: [{ status: 'refunded',  label: 'Marcar reembolso emitido', color: 'ghost' }],
  refunded:  [],
};

const formatPrice = (n) =>
  '¢' + Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const customerName = (u) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '—';

const itemImage = (item) =>
  item.presentations?.fragrances?.main_image_url
  ?? item.decants?.fragrances?.main_image_url
  ?? null;

// ── Status timeline ───────────────────────────────────────────
function StatusTimeline({ status }) {
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const currentIdx  = STATUS_STEPS.indexOf(status);

  if (isCancelled) {
    return (
      <div className="od-timeline od-timeline--cancelled">
        <span className="od-timeline__cancel-badge" style={{ color: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] }}>
          {STATUS_LABELS[status]}
        </span>
      </div>
    );
  }

  return (
    <div className="od-timeline">
      {STATUS_STEPS.map((s, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        const color   = done || current ? STATUS_COLORS[s] : undefined;
        return (
          <div key={s} className="od-timeline__step">
            <div className="od-timeline__dot-wrap">
              {i > 0 && (
                <div className={`od-timeline__line od-timeline__line--left ${done || current ? 'od-timeline__line--done' : ''}`} />
              )}
              <div
                className={`od-timeline__dot ${current ? 'od-timeline__dot--current' : ''} ${done ? 'od-timeline__dot--done' : ''}`}
                style={done || current ? { borderColor: color, background: done ? color : 'transparent' } : {}}
              >
                {done && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                    stroke="#0E0E0E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {current && <div className="od-timeline__dot-inner" style={{ background: color }} />}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`od-timeline__line od-timeline__line--right ${done ? 'od-timeline__line--done' : ''}`} />
              )}
            </div>
            <span className={`od-timeline__label ${current ? 'od-timeline__label--current' : ''} ${done ? 'od-timeline__label--done' : ''}`}
              style={current ? { color } : {}}>
              {STATUS_LABELS[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order,       setOrder]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saveErr,     setSaveErr]     = useState('');
  const [trackingNum, setTrackingNum] = useState('');

  useEffect(() => {
    fetchOrderDetail(orderId)
      .then(d => { setOrder(d); setTrackingNum(d.tracking_number ?? ''); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleAction = async (action) => {
    if (saving) return;
    setSaving(true);
    setSaveErr('');
    try {
      await updateOrderStatus(order.id, action.status, {
        trackingNumber: action.needsTracking ? trackingNum : undefined,
      });
      setOrder(prev => ({
        ...prev,
        status: action.status,
        tracking_number: action.needsTracking ? trackingNum : prev.tracking_number,
      }));
    } catch (e) {
      setSaveErr(e.message ?? 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="od-loading" />;
  if (!order)  return <div className="od-loading" />;

  const actions  = NEXT_ACTIONS[order.status] ?? [];
  const needsTracking = actions.some(a => a.needsTracking);

  const address = [order.shipping_address, order.shipping_district, order.shipping_city, order.shipping_province]
    .filter(Boolean).join(', ');

  return (
    <div className="od-page">

      {/* Top bar */}
      <div className="od-topbar">
        <button className="od-topbar__back" type="button" onClick={() => navigate('/admin/orders')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="od-topbar__title">Orden #{order.order_number}</span>
        <span className="od-topbar__date">{formatDate(order.created_at)}</span>
      </div>

      <div className="od-content">

        {/* Timeline */}
        <StatusTimeline status={order.status} />

        {/* Customer */}
        <div className="od-card">
          <div className="od-card__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="od-card__body">
            <span className="od-card__label">Cliente</span>
            <p className="od-card__main">{customerName(order.users)}</p>
            {order.users?.email && <p className="od-card__sub">{order.users.email}</p>}
            {order.users?.phone && <p className="od-card__sub">{order.users.phone}</p>}
          </div>
        </div>

        {/* Address */}
        {address && (
          <div className="od-card">
            <div className="od-card__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className="od-card__body">
              <span className="od-card__label">Dirección de envío</span>
              <p className="od-card__main">{address}</p>
            </div>
          </div>
        )}

        {/* Products */}
        <div className="od-section">
          <h2 className="od-section__title">Productos</h2>
          <div className="od-items">
            {(order.order_items ?? []).map(item => {
              const img = itemImage(item);
              return (
                <div key={item.id} className="od-item">
                  <div className="od-item__img-wrap">
                    {img
                      ? <img src={img} alt={item.fragrance_name} className="od-item__img" />
                      : <div className="od-item__img-placeholder">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="#4D4635" strokeWidth="1.2" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                    }
                    {item.item_type === 'decant' && <span className="od-item__type-badge">Decant</span>}
                  </div>
                  <div className="od-item__info">
                    <span className="od-item__name">{item.fragrance_name}</span>
                    <span className="od-item__meta">{item.brand_name} · {item.size_ml} ml</span>
                    {item.promo_type && (() => {
                      const label  = getPromoLabel(item.promo_type, item.discount_pct, item.promo_value);
                      const colors = PROMO_COLORS[item.promo_type];
                      if (!label || !colors) return null;
                      return (
                        <span className="promo-chip od-item__promo"
                          style={{ color: colors.color, background: colors.bg, borderColor: colors.color }}>
                          {label}
                        </span>
                      );
                    })()}
                    <span className="od-item__price-row">
                      <span className="od-item__qty">×{item.quantity}</span>
                      <span className="od-item__unit">{formatPrice(item.unit_price)} c/u</span>
                    </span>
                  </div>
                  <span className="od-item__subtotal">{formatPrice(item.subtotal)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="od-section">
          <h2 className="od-section__title">Resumen de pago</h2>
          <div className="od-totals">
            <div className="od-totals__row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            {Number(order.discount) > 0 && (
              <div className="od-totals__row od-totals__row--good"><span>Descuento</span><span>−{formatPrice(order.discount)}</span></div>
            )}
            {Number(order.shipping_cost) > 0 && (
              <div className="od-totals__row"><span>Envío</span><span>{formatPrice(order.shipping_cost)}</span></div>
            )}
            {Number(order.tax) > 0 && (
              <div className="od-totals__row"><span>Impuesto</span><span>{formatPrice(order.tax)}</span></div>
            )}
            <div className="od-totals__row od-totals__row--total"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
          <div className="od-payment-info">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>{order.payment_provider ?? 'TiloPay'}{order.payment_ref ? ` · ${order.payment_ref}` : ''}</span>
          </div>
        </div>

        {/* Tracking (show if shipped or delivered) */}
        {(order.status === 'shipped' || order.status === 'delivered') && (
          <div className="od-section">
            <h2 className="od-section__title">Seguimiento del envío</h2>
            <p className="od-section__hint">
              Ingresa el código de seguimiento que te dio el servicio de mensajería (ej: Correos de Costa Rica, Coordi, etc.).
              El cliente lo usará para rastrear su paquete.
            </p>
            <div className="od-tracking-wrap">
              <input
                className="od-input"
                type="text"
                placeholder="Ej: CR123456789CR"
                value={trackingNum}
                onChange={e => setTrackingNum(e.target.value)}
              />
              <button
                type="button"
                className="od-btn od-btn--ghost"
                disabled={saving}
                onClick={() => handleAction({ status: order.status })}
              >
                {saving ? 'Guardando…' : 'Guardar código'}
              </button>
            </div>
            {order.tracking_number && (
              <p className="od-tracking-saved">
                Código actual: <strong>{order.tracking_number}</strong>
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="od-section od-section--actions">
            <h2 className="od-section__title">Actualizar estado</h2>

            {needsTracking && (
              <>
                <p className="od-section__hint">
                  Antes de marcar como enviado, ingresa el código de seguimiento del mensajero.
                </p>
                <input
                  className="od-input"
                  type="text"
                  placeholder="Código de seguimiento (Ej: CR123456789CR)"
                  value={trackingNum}
                  onChange={e => setTrackingNum(e.target.value)}
                />
              </>
            )}

            <div className="od-actions">
              {actions.map(action => (
                <button
                  key={action.status}
                  type="button"
                  className={`od-btn od-btn--${action.color}`}
                  disabled={saving || (action.needsTracking && !trackingNum.trim())}
                  onClick={() => handleAction(action)}
                >
                  {saving ? 'Actualizando…' : action.label}
                </button>
              ))}
            </div>

            {saveErr && <p className="od-err">{saveErr}</p>}
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="od-section">
            <h2 className="od-section__title">Notas del cliente</h2>
            <p className="od-notes">{order.notes}</p>
          </div>
        )}

      </div>
    </div>
  );
}
