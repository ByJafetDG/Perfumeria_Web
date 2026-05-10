import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/ui/BackButton/BackButton';
import { getPromoLabel, PROMO_COLORS, calcEffectivePrice } from '../../utils/promoUtils';
import './Cart.css';

const formatPrice = p => `₡${Number(p).toLocaleString('es-CR')}`;

function CartItem({ item }) {
  const { updateQty, removeItem } = useCart();
  const infoRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, closing: false });
  const infoText = `${item.brand} | ${item.format === 'decant' ? 'Decant' : 'Botella completa'}`;

  useEffect(() => {
    if (infoRef.current) {
      setOverflows(infoRef.current.scrollWidth > infoRef.current.offsetWidth);
    }
  }, [infoText]);

  const openDeleteModal  = () => setDeleteModal({ show: true, closing: false });
  const closeDeleteModal = () => {
    setDeleteModal(m => ({ ...m, closing: true }));
    setTimeout(() => setDeleteModal({ show: false, closing: false }), 380);
  };
  const confirmDelete = () => removeItem(item.cartKey);

  return (
    <div className="cart-item">
      <Link to={`/product/${item.slug}`} className="cart-item__img-wrap">
        <img src={item.imageUrl} alt={item.name} className="cart-item__img" />
      </Link>

      <div className="cart-item__info">
        <div className="cart-item__top">
          <div className="cart-item__name-row">
            <span className="cart-item__name">{item.name}</span>
            <button
              className="cart-item__remove"
              onClick={openDeleteModal}
              aria-label="Eliminar producto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>

          <div className="cart-item__meta-wrap" ref={infoRef}>
            {overflows ? (
              <div className="cart-item__meta-track">
                <span className="cart-item__meta">{infoText}</span>
                <span className="cart-item__meta" aria-hidden="true">{infoText}</span>
              </div>
            ) : (
              <span className="cart-item__meta">{infoText}</span>
            )}
          </div>

          <div className="cart-item__size-row">
            <span className="cart-item__size">{item.size_ml} ml</span>
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


        <div className="cart-item__bottom">
          <div className="cart-item__qty-wrap">
            <button
              className={`cart-item__qty-btn${item.qty === 1 ? ' cart-item__qty-btn--disabled' : ''}`}
              onClick={() => item.qty > 1 && updateQty(item.cartKey, -1)}
              aria-label="Reducir cantidad"
              disabled={item.qty === 1}
            >
              <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                <line x1="0" y1="1" x2="10" y2="1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="cart-item__qty">{item.qty}</span>
            <button
              className="cart-item__qty-btn"
              onClick={() => updateQty(item.cartKey, 1)}
              aria-label="Aumentar cantidad"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line x1="5" y1="0" x2="5" y2="10" stroke="#D0C5AF" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="0" y1="5" x2="10" y2="5" stroke="#D0C5AF" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {(() => {
              const { subtotal: effectiveSub, discount: itemDiscount } =
                calcEffectivePrice(item.price, item.qty, item.promoType, item.discountPct);
              return itemDiscount > 0 ? (
                <div className="cart-item__price-wrap">
                  <span className="cart-item__price--original">{formatPrice(item.price * item.qty)}</span>
                  <span className="cart-item__price">{formatPrice(effectiveSub)}</span>
                </div>
              ) : (
                <span className="cart-item__price">{formatPrice(item.price * item.qty)}</span>
              );
            })()}
        </div>
      </div>

      {/* ── Modal: Confirmar eliminación ─────────────────── */}
      {deleteModal.show && createPortal(
        <div
          className={`cart-delete-overlay${deleteModal.closing ? ' cart-delete-overlay--out' : ''}`}
          onClick={closeDeleteModal}
        >
          <div
            className={`cart-delete-modal${deleteModal.closing ? ' cart-delete-modal--out' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="cart-delete-modal__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="#E57373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </div>
            <p className="cart-delete-modal__title">¿Eliminar fragancia?</p>
            <p className="cart-delete-modal__sub">{item.name} será removida de tu bolsa</p>
            <div className="cart-delete-modal__actions">
              <button className="cart-delete-modal__confirm" onClick={confirmDelete}>
                Sí, eliminar
              </button>
              <button className="cart-delete-modal__cancel" onClick={closeDeleteModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Cart() {
  const { items, total, totalDiscount } = useCart();
  const { user }         = useAuth();
  const navigate         = useNavigate();

  function handleCheckout() {
    if (user) {
      navigate('/checkout');
    } else {
      navigate('/login?redirect=/checkout');
    }
  }

  return (
    <div className="cart-page">

      <BackButton />

      {/* ── Header ───────────────────────────────────────── */}
      <header className="cart-header">
        <h1 className="cart-header__title">Bolsa</h1>
        <span className="cart-header__sub">DE LA COLECCIÓN DEL PERFUMERO 777</span>
      </header>

      {/* ── Items ────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="cart-summary">
          <div className="cart-summary__row">
            <div className="cart-summary__block">
              <span className="cart-summary__label">Subtotal</span>
              <span className="cart-summary__total">{formatPrice(total)}</span>
            </div>
            <div className="cart-summary__block cart-summary__block--right">
              {totalDiscount > 0 ? (
                <>
                  <span className="cart-summary__label">Descuento</span>
                  <span className="cart-summary__discount-amount">−{formatPrice(totalDiscount)}</span>
                </>
              ) : (
                <>
                  <span className="cart-summary__label">Envío</span>
                  <span className="cart-summary__shipping">Se calcula a continuación</span>
                </>
              )}
            </div>
          </div>
          {totalDiscount > 0 && (
            <div className="cart-summary__row">
              <div className="cart-summary__block" />
              <div className="cart-summary__block cart-summary__block--right">
                <span className="cart-summary__label">Envío</span>
                <span className="cart-summary__shipping">Se calcula a continuación</span>
              </div>
            </div>
          )}
          <button className="cart-summary__cta" onClick={handleCheckout}>
            <span>Proceder al pago</span>
            <svg width="16" height="12" viewBox="0 0 24 18" fill="none"
              stroke="#3C2F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="0" y1="9" x2="22" y2="9" />
              <polyline points="14 1 22 9 14 17" />
            </svg>
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="cart-empty">
          <p className="cart-empty__text">Tu bolsa está vacía.</p>
          <Link to="/catalog" className="cart-empty__cta">Explorar catálogo</Link>
        </div>
      ) : (
        <section className="cart-items">
          {items.map(item => (
            <CartItem key={item.cartKey} item={item} />
          ))}
        </section>
      )}

    </div>
  );
}
