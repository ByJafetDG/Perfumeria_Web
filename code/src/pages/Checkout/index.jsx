import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { getPromoLabel, PROMO_COLORS, calcEffectivePrice } from '../../utils/promoUtils';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import BackButton from '../../components/ui/BackButton/BackButton';
import CR_DIVISIONS from '../../data/crDivisions';
import { AddressSelect } from '../../components/ui/AddressSelect';
import { fetchAdminConfig } from '../../services/adminConfig';
import { fetchUserAddresses } from '../../services/addresses';
import { createOrder, getShippingCost } from '../../services/orders';
import './Checkout.css';

const formatPrice = p => `₡${Number(p).toLocaleString('es-CR')}`;

const BagIcon = () => (
  <svg width="15" height="19" viewBox="0 0 15 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.5 5H11.5C11.5 2.79 9.71 1 7.5 1C5.29 1 3.5 2.79 3.5 5H1.5C0.95 5 0.5 5.45 0.5 6V16C0.5 17.1 1.4 18 2.5 18H12.5C13.6 18 14.5 17.1 14.5 16V6C14.5 5.45 14.05 5 13.5 5ZM7.5 2.5C8.88 2.5 10 3.62 10 5H5C5 3.62 6.12 2.5 7.5 2.5ZM7.5 12C6.12 12 5 10.88 5 9.5C5 8.12 6.12 7 7.5 7C8.88 7 10 8.12 10 9.5C10 10.88 8.88 12 7.5 12Z"
      fill="#F2CA50"
    />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="12" height="8" viewBox="0 0 12 8" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' }}
  >
    <path d="M1 1L6 6.5L11 1" stroke="#E5E2E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function MarqueeName({ name }) {
  const wrapRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (wrapRef.current) {
      setOverflows(wrapRef.current.scrollWidth > wrapRef.current.offsetWidth);
    }
  }, [name]);

  return (
    <div className="order-accordion__name-wrap" ref={wrapRef}>
      {overflows ? (
        <div className="order-accordion__name-track">
          <span className="order-accordion__item-name">{name}</span>
          <span className="order-accordion__item-name" aria-hidden="true">{name}</span>
        </div>
      ) : (
        <span className="order-accordion__item-name">{name}</span>
      )}
    </div>
  );
}

function MarqueeTotal({ text }) {
  const wrapRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (wrapRef.current) {
      setOverflows(wrapRef.current.scrollWidth > wrapRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <div className="order-accordion__total-wrap" ref={wrapRef}>
      {overflows ? (
        <div className="order-accordion__total-track">
          <span className="order-accordion__total">{text}</span>
          <span className="order-accordion__total" aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span className="order-accordion__total">{text}</span>
      )}
    </div>
  );
}

function OrderSummaryAccordion() {
  const { items, total, totalDiscount } = useCart();
  const [open, setOpen] = useState(false);
  const totalText = formatPrice(total);

  return (
    <div className="order-accordion">
      {/* ── Trigger ── */}
      <button
        className="order-accordion__trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="order-accordion__left">
          <BagIcon />
          <span className="order-accordion__title">Resumen de la orden</span>
        </div>
        <div className="order-accordion__right">
          <MarqueeTotal text={totalText} />
          <ChevronIcon open={open} />
        </div>
      </button>

      {/* ── Contenido desplegable ── */}
      <div className={`order-accordion__body ${open ? 'order-accordion__body--open' : ''}`}>
        <div className="order-accordion__inner">
          <ul className="order-accordion__list">
            {items.map(item => (
              <li key={item.cartKey} className="order-accordion__item">
                <img src={item.imageUrl} alt={item.name} className="order-accordion__img" />
                <div className="order-accordion__item-info">
                  <MarqueeName name={item.name} />
                  <div className="order-accordion__item-meta-row">
                    <span className="order-accordion__item-meta">
                      {item.size_ml} ml · x{item.qty}
                    </span>
                    {item.promoType && (() => {
                      const label  = getPromoLabel(item.promoType, item.discountPct, item.promoValue);
                      const colors = PROMO_COLORS[item.promoType];
                      if (!label || !colors) return null;
                      return (
                        <span className="promo-chip"
                          style={{ color: colors.color, background: colors.bg, borderColor: colors.color }}>
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {(() => {
                    const { subtotal: effSub, discount: itemDisc } =
                      calcEffectivePrice(item.price, item.qty, item.promoType, item.discountPct);
                    return itemDisc > 0 ? (
                      <div className="order-accordion__item-price-wrap">
                        <span className="order-accordion__item-price--original">{formatPrice(item.price * item.qty)}</span>
                        <span className="order-accordion__item-price">{formatPrice(effSub)}</span>
                      </div>
                    ) : (
                      <span className="order-accordion__item-price">{formatPrice(item.price * item.qty)}</span>
                    );
                  })()}
              </li>
            ))}
          </ul>
          <div className="order-accordion__footer">
            {totalDiscount > 0 && (
              <div className="order-accordion__footer-discount">
                <span className="order-accordion__footer-label">Descuento</span>
                <span className="order-accordion__footer-discount-amount">−{formatPrice(totalDiscount)}</span>
              </div>
            )}
            <div className="order-accordion__footer-row">
              <span className="order-accordion__footer-label">Total</span>
              <span className="order-accordion__footer-total">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const HomeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2CA50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

function ShippingAddress({ provincia, canton, distrito, address, onProvincia, onCanton, onDistrito, onAddress, onSelectSavedAddress, onResetAddress, user }) {
  const provincias = Object.keys(CR_DIVISIONS);
  const cantones   = provincia ? Object.keys(CR_DIVISIONS[provincia]) : [];
  const distritos  = provincia && canton ? CR_DIVISIONS[provincia][canton] : [];

  const [addrTab,      setAddrTab]      = useState('new');
  const [savedAddrs,   setSavedAddrs]   = useState([]);
  const [loadingAddrs, setLoadingAddrs] = useState(false);
  const [selectedId,   setSelectedId]   = useState(null);

  useEffect(() => {
    if (addrTab !== 'saved' || !user) return;
    setLoadingAddrs(true);
    fetchUserAddresses(user.id)
      .then(data => setSavedAddrs(data))
      .catch(() => setSavedAddrs([]))
      .finally(() => setLoadingAddrs(false));
  }, [addrTab, user]);

  function handleTabChange(tab) {
    setAddrTab(tab);
    if (tab === 'new') {
      setSelectedId(null);
      onResetAddress();
    }
  }

  function handleSelectSaved(addr) {
    setSelectedId(addr.id);
    onSelectSavedAddress({
      provincia: addr.province,
      canton:    addr.city,
      distrito:  addr.district,
      address:   addr.address_line,
    });
  }

  return (
    <section className="shipping-section shipping-section--step1">
      <div className="shipping-section__header">
        <span className="shipping-section__num">01</span>
        <span className="shipping-section__title">Dirección de envío</span>
      </div>

      {/* ── Tabs ── */}
      <div className="addr-tabs">
        <button
          type="button"
          className={`addr-tab ${addrTab === 'new' ? 'addr-tab--active' : ''}`}
          onClick={() => handleTabChange('new')}
        >
          Nueva dirección
        </button>
        <button
          type="button"
          className={`addr-tab ${addrTab === 'saved' ? 'addr-tab--active' : ''}`}
          onClick={() => handleTabChange('saved')}
        >
          Mis direcciones
        </button>
      </div>

      {/* ── Tab: Nueva dirección ── */}
      {addrTab === 'new' && (
        <div className="shipping-section__fields">
          <AddressSelect
            label="Provincia"
            value={provincia}
            onChange={onProvincia}
            options={provincias}
            placeholder="Seleccionar provincia"
          />
          <AddressSelect
            label="Cantón"
            value={canton}
            onChange={onCanton}
            options={cantones}
            placeholder="Seleccionar cantón"
            disabled={!provincia}
          />
          <AddressSelect
            label="Distrito"
            value={distrito}
            onChange={onDistrito}
            options={distritos}
            placeholder="Seleccionar distrito"
            disabled={!canton}
          />

          <div className="addr-field">
            <span className="addr-field__label">Dirección específica</span>
            <input
              className="addr-field__input"
              type="text"
              placeholder="Número de casa, calle, señas..."
              value={address}
              onChange={e => onAddress(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Mis direcciones ── */}
      {addrTab === 'saved' && (
        <div className="saved-addrs">
          {/* No autenticado */}
          {!user && (
            <div className="saved-addrs__empty">
              <HomeIcon />
              <span className="saved-addrs__empty-text">Inicia sesión para ver tus direcciones guardadas</span>
              <a href="/login?redirect=/checkout" className="saved-addrs__login-link">Iniciar sesión</a>
            </div>
          )}

          {/* Cargando */}
          {user && loadingAddrs && (
            <div className="saved-addrs__loading">
              {[1, 2].map(i => (
                <div key={i} className="saved-addr-skeleton" />
              ))}
            </div>
          )}

          {/* Sin direcciones */}
          {user && !loadingAddrs && savedAddrs.length === 0 && (
            <div className="saved-addrs__empty">
              <HomeIcon />
              <span className="saved-addrs__empty-text">Aún no tienes direcciones guardadas</span>
              <a href="/addresses" className="saved-addrs__add-link">
                <PlusIcon />
                Agregar dirección
              </a>
            </div>
          )}

          {/* Lista de direcciones */}
          {user && !loadingAddrs && savedAddrs.map(addr => (
            <button
              key={addr.id}
              type="button"
              className={`saved-addr-card ${selectedId === addr.id ? 'saved-addr-card--selected' : ''}`}
              onClick={() => handleSelectSaved(addr)}
            >
              <div className="saved-addr-card__info">
                <div className="saved-addr-card__top">
                  <span className="saved-addr-card__label">{addr.label || 'Dirección'}</span>
                  {addr.is_default && (
                    <span className="saved-addr-card__default">Predeterminada</span>
                  )}
                </div>
                <span className="saved-addr-card__location">
                  {[addr.district, addr.city, addr.province].filter(Boolean).join(', ')}
                </span>
                <span className="saved-addr-card__street">{addr.address_line}</span>
              </div>
              {selectedId === addr.id && (
                <div className="saved-addr-card__check">
                  <CheckCircleIcon />
                </div>
              )}
            </button>
          ))}

          {/* Link para agregar más (cuando ya hay direcciones) */}
          {user && !loadingAddrs && savedAddrs.length > 0 && (
            <a href="/addresses" className="saved-addrs__manage-link">
              <PlusIcon />
              Gestionar direcciones
            </a>
          )}
        </div>
      )}
    </section>
  );
}

// formatPrice ya está definido arriba

const SHIPPING_METHODS = [
  {
    id: 'pickup',
    name: 'Entrega en persona',
    detail: 'El mismo día',
    price: 3500,
    onlyFor: { provincia: 'Guanacaste', canton: 'Liberia' },
  },
  {
    id: 'correos',
    name: 'Correos de Costa Rica',
    detail: '5-7 días (Depende del lugar)',
    price: 3500,
    onlyFor: null,
  },
];

function ShippingMethod({ provincia, canton, selected, onSelect }) {
  const isLiberia = provincia === 'Guanacaste' && canton === 'Liberia';

  // Resetear si pickup deja de estar disponible
  useEffect(() => {
    if (!isLiberia && selected === 'pickup') onSelect('');
  }, [isLiberia]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickup  = SHIPPING_METHODS.find(m => m.id === 'pickup');
  const correos = SHIPPING_METHODS.find(m => m.id === 'correos');

  return (
    <section className="shipping-section">
      <div className="shipping-section__header">
        <span className="shipping-section__num">02</span>
        <span className="shipping-section__title">Método de envío</span>
      </div>

      <div className="ship-methods">
        {/* Entrega en persona — siempre en DOM, animada */}
        <div className={`ship-method-reveal ${isLiberia ? 'ship-method-reveal--open' : ''}`}>
          <div className="ship-method-reveal__inner">
            <button
              type="button"
              className={`ship-method ${selected === pickup.id ? 'ship-method--selected' : ''}`}
              onClick={() => onSelect(pickup.id)}
              tabIndex={isLiberia ? 0 : -1}
            >
              <div className="ship-method__info">
                <span className="ship-method__name">{pickup.name}</span>
                <span className="ship-method__detail">{pickup.detail}</span>
              </div>
              <span className="ship-method__price">{formatPrice(pickup.price)}</span>
            </button>
          </div>
        </div>

        {/* Correos — siempre visible */}
        <button
          type="button"
          className={`ship-method ${selected === correos.id ? 'ship-method--selected' : ''}`}
          onClick={() => onSelect(correos.id)}
        >
          <div className="ship-method__info">
            <span className="ship-method__name">{correos.name}</span>
            <span className="ship-method__detail">{correos.detail}</span>
          </div>
          <span className="ship-method__price">{formatPrice(correos.price)}</span>
        </button>

        {!provincia && (
          <p className="ship-methods__hint">Selecciona tu dirección para ver las opciones de envío.</p>
        )}
      </div>
    </section>
  );
}

const ClipboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/>
  </svg>
);

const CardIcon = () => (
  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="19" height="15" rx="2.5" stroke="#D0C5AF"/>
    <rect x="0" y="4" width="20" height="3" fill="#D0C5AF" fillOpacity="0.4"/>
    <rect x="3" y="10" width="5" height="2" rx="1" fill="#D0C5AF" fillOpacity="0.6"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="15" height="19" rx="2.5" stroke="#D0C5AF"/>
    <circle cx="8" cy="16.5" r="1" fill="#D0C5AF" fillOpacity="0.6"/>
    <rect x="5" y="2" width="6" height="1" rx="0.5" fill="#D0C5AF" fillOpacity="0.4"/>
  </svg>
);

function fallbackCopy(text, onSuccess) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { if (document.execCommand('copy')) onSuccess(); } catch (_) {}
  document.body.removeChild(el);
}


const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2CA50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

function PaymentMethod({ selected, onSelect, storePhone }) {
  const [copied, setCopied] = useState(false);

  const cardOpen  = selected === 'card';
  const sinpeOpen = selected === 'sinpe';

  function handleCopy() {
    if (!storePhone) return;
    const doShow = () => { setCopied(true); setTimeout(() => setCopied(false), 2500); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(storePhone).then(doShow).catch(() => fallbackCopy(storePhone, doShow));
    } else {
      fallbackCopy(storePhone, doShow);
    }
  }

  return (
    <section className="shipping-section">
      <div className="shipping-section__header">
        <span className="shipping-section__num">03</span>
        <span className="shipping-section__title">Método de Pago</span>
      </div>

      <div className="pay-methods">

        {/* ── Tarjeta (TiloPay) ── */}
        <div className={`pay-method ${cardOpen ? 'pay-method--selected' : ''}`}>
          <button
            type="button"
            className="pay-method__trigger"
            onClick={() => onSelect(cardOpen ? '' : 'card')}
          >
            <div className="pay-method__trigger-left">
              <CardIcon />
              <span className="pay-method__name">Tarjeta de Crédito / Débito</span>
            </div>
            <span className={`pay-method__chevron ${cardOpen ? 'pay-method__chevron--open' : ''}`}>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1L6 6.5L11 1" stroke="#D0C5AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          <div className={`pay-method__body ${cardOpen ? 'pay-method__body--open' : ''}`}>
            <div className="pay-method__inner">
              <div className="pay-method__tilopay">
                <ShieldIcon />
                <div className="pay-method__tilopay-text">
                  <span className="pay-method__tilopay-title">Pago seguro con TiloPay</span>
                  <span className="pay-method__tilopay-desc">
                    Al continuar serás redirigido a la plataforma de TiloPay, donde podrás ingresar
                    los datos de tu tarjeta de forma segura. TiloPay cumple con los estándares
                    PCI&nbsp;DSS y 3D&nbsp;Secure.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SINPE Móvil ── */}
        <div className={`pay-method ${sinpeOpen ? 'pay-method--selected' : ''}`}>
          <button
            type="button"
            className="pay-method__trigger"
            onClick={() => onSelect(sinpeOpen ? '' : 'sinpe')}
          >
            <div className="pay-method__trigger-left">
              <PhoneIcon />
              <span className="pay-method__name">SINPE Móvil</span>
            </div>
            <span className={`pay-method__chevron ${sinpeOpen ? 'pay-method__chevron--open' : ''}`}>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1L6 6.5L11 1" stroke="#D0C5AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          <div className={`pay-method__body ${sinpeOpen ? 'pay-method__body--open' : ''}`}>
            <div className="pay-method__inner">
              <div className="pay-method__sinpe">
                <span className="pay-method__sinpe-label">Transferir al número</span>
                <div className="pay-method__sinpe-phone-row">
                  <span className="pay-method__sinpe-phone">{storePhone ?? '—'}</span>
                  {storePhone && (
                    <button
                      type="button"
                      className="pay-method__sinpe-copy"
                      onClick={handleCopy}
                      aria-label="Copiar número"
                    >
                      <ClipboardIcon />
                    </button>
                  )}
                </div>
                <span className="pay-method__sinpe-hint">
                  Envía el comprobante por WhatsApp al mismo número para confirmar tu pedido.
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Toast de copiado ── */}
      <div className={`sinpe-toast ${copied ? 'sinpe-toast--visible' : ''}`} aria-live="polite">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Número copiado</span>
      </div>
    </section>
  );
}

function BottomActionBar({ cartTotal, shippingMethod, paymentMethod, canPay, loading, onAction }) {
  const shippingCost = shippingMethod
    ? (SHIPPING_METHODS.find(m => m.id === shippingMethod)?.price ?? 0)
    : 0;
  const grandTotal = cartTotal + shippingCost;

  const isSinpe  = paymentMethod === 'sinpe';
  const disabled = !canPay || loading;

  let btnLabel = 'PAGAR';
  if (loading)        btnLabel = 'PROCESANDO...';
  else if (isSinpe)   btnLabel = 'ENVIAR COMPROBANTE';

  return (
    <div className="checkout-bar">
      <div className="checkout-bar__top">
        <span className="checkout-bar__label">Total a pagar</span>
        <div className="checkout-bar__right">
          <span className="checkout-bar__amount">{formatPrice(grandTotal)}</span>
          {shippingMethod && (
            <span className="checkout-bar__shipping-note">incl. envío</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`checkout-bar__btn ${disabled ? 'checkout-bar__btn--disabled' : ''}`}
        onClick={onAction}
        disabled={disabled}
      >
        <span className="checkout-bar__btn-text">{btnLabel}</span>
        {!loading && (isSinpe ? <SendIcon /> : <ArrowIcon />)}
      </button>
    </div>
  );
}

export default function Checkout() {
  const { total: cartTotal, items: cartItems, clearCart } = useCart();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [provincia,      setProvincia]      = useState('');
  const [canton,         setCanton]         = useState('');
  const [distrito,       setDistrito]       = useState('');
  const [address,        setAddress]        = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState('');
  const [storePhone,     setStorePhone]     = useState(null);
  const [socialWhatsapp, setSocialWhatsapp] = useState(null);
  const [adminCfg,       setAdminCfg]       = useState({});
  const [loading,        setLoading]        = useState(false);
  const [payError,       setPayError]       = useState('');

  useEffect(() => {
    // Pre-llenar si el usuario volvió de un pago cancelado
    try {
      const raw = localStorage.getItem('tilopay_pending');
      if (raw) {
        const pending = JSON.parse(raw);
        const cs = pending.checkoutState;
        if (cs) {
          if (cs.provincia)      setProvincia(cs.provincia);
          if (cs.canton)         setCanton(cs.canton);
          if (cs.distrito)       setDistrito(cs.distrito);
          if (cs.address)        setAddress(cs.address);
          if (cs.shippingMethod) setShippingMethod(cs.shippingMethod);
          if (cs.paymentMethod)  setPaymentMethod(cs.paymentMethod);
        }
      }
    } catch (_) {}

    fetchAdminConfig()
      .then(cfg => {
        setStorePhone(cfg.store_phone ?? null);
        setSocialWhatsapp(cfg.social_whatsapp ?? null);
        setAdminCfg(cfg);
      })
      .catch(() => {});
  }, []);

  function handleProvincia(val) {
    setProvincia(val);
    setCanton('');
    setDistrito('');
    setShippingMethod('');
  }

  function handleCanton(val) {
    setCanton(val);
    setDistrito('');
    setShippingMethod('');
  }

  function handleResetAddress() {
    setProvincia('');
    setCanton('');
    setDistrito('');
    setAddress('');
    setShippingMethod('');
  }

  function handleSelectSavedAddress({ provincia: p, canton: c, distrito: d, address: a }) {
    setProvincia(p);
    setCanton(c);
    setDistrito(d);
    setAddress(a);
    setShippingMethod('');
  }

  const canPay =
    provincia !== '' &&
    canton    !== '' &&
    distrito  !== '' &&
    address.trim() !== '' &&
    shippingMethod !== '' &&
    paymentMethod  !== '';

  async function handleAction() {
    if (!canPay || loading || !user) return;
    setLoading(true);
    setPayError('');

    try {
      const orderPrefix = adminCfg.order_prefix ?? 'PF';

      // ── SINPE: crea la orden localmente (confirmación manual) ───────
      if (paymentMethod === 'sinpe') {
        const order = await createOrder(user.id, cartItems, {
          provincia, canton, distrito, address,
          shippingMethod,
          paymentProvider: 'sinpe',
          orderPrefix,
        });
        await clearCart();
        const digits = (socialWhatsapp || storePhone || '').replace(/\D/g, '');
        const phone  = digits.length === 8 ? `506${digits}` : digits;
        const msg    = encodeURIComponent(
          `Hola 👋, acabo de realizar el pedido *${order.order_number}* y quiero enviar el comprobante de mi pago por SINPE Móvil.`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
        navigate(`/account`, { state: { orderPlaced: order.order_number } });
        return;
      }

      // ── Tarjeta: verificar sesión antes de tocar nada ───────────────
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');

      // El servidor crea la orden + llama Tilopay de forma atómica.
      // Si Tilopay falla, el servidor borra la orden antes de responder.
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          cartItems: cartItems.map(i => ({
            cartKey: i.cartKey, name: i.name, brand: i.brand,
            size_ml: i.size_ml, price: i.price, qty: i.qty,
          })),
          shipping: { provincia, canton, distrito, address, shippingMethod },
          orderPrefix,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data?.error === 'OUT_OF_STOCK') {
          throw new Error(`"${data.item}" se agotó. Actualiza tu carrito e intenta de nuevo.`);
        }
        throw new Error(data?.error ?? 'Error al procesar el pago');
      }
      if (!data?.paymentUrl) {
        throw new Error('Error al procesar el pago');
      }

      localStorage.setItem('tilopay_pending', JSON.stringify({
        orderId:     data.orderId,
        orderNumber: data.orderNumber,
        ts:          Date.now(),
        checkoutState: { provincia, canton, distrito, address, shippingMethod, paymentMethod },
      }));

      window.location.href = data.paymentUrl;

    } catch (err) {
      setPayError(err.message || 'Ocurrió un error al procesar el pago. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="checkout">
      <div className="checkout__orb" aria-hidden="true" />
      <BackButton />
      <section className="checkout__hero">
        <span className="checkout__eyebrow">Finalizar tu orden</span>
        <h1 className="checkout__heading">Pago</h1>
      </section>

      <OrderSummaryAccordion />

      <ShippingAddress
        provincia={provincia}
        canton={canton}
        distrito={distrito}
        address={address}
        onProvincia={handleProvincia}
        onCanton={handleCanton}
        onDistrito={setDistrito}
        onAddress={setAddress}
        onResetAddress={handleResetAddress}
        onSelectSavedAddress={handleSelectSavedAddress}
        user={user}
      />

      <ShippingMethod
        provincia={provincia}
        canton={canton}
        selected={shippingMethod}
        onSelect={setShippingMethod}
      />

      <PaymentMethod
        selected={paymentMethod}
        onSelect={setPaymentMethod}
        storePhone={storePhone}
      />

      {payError && (
        <div className="checkout__error" role="alert">{payError}</div>
      )}

      <BottomActionBar
        cartTotal={cartTotal}
        shippingMethod={shippingMethod}
        paymentMethod={paymentMethod}
        canPay={canPay}
        loading={loading}
        onAction={handleAction}
      />
    </div>
  );
}
