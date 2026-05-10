import { Link } from 'react-router-dom';
import { useWishlist } from '../../../contexts/WishlistContext';
import { getPromoLabel, PROMO_COLORS } from '../../../utils/promoUtils';
import './ProductCard.css';

const formatPrice = (price) =>
  `₡${Number(price).toLocaleString('es-CR')}`;

function HeartIcon({ active }) {
  return (
    <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 13.5C8 13.5 1.5 9.5 1.5 4.5C1.5 2.567 3.067 1 5 1C6.12 1 7.11 1.538 7.75 2.37C7.876 2.536 8.124 2.536 8.25 2.37C8.89 1.538 9.88 1 11 1C12.933 1 14.5 2.567 14.5 4.5C14.5 9.5 8 13.5 8 13.5Z"
        fill={active ? '#F2CA50' : 'none'}
        stroke={active ? '#F2CA50' : 'rgba(255,255,255,0.75)'}
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductCard({ product, showAddToCart = false, onAddToCart, onWishlistToggle }) {
  const { toggle, isWished } = useWishlist();
  const wished = isWished(product.id);

  const productUrl  = `/product/${product.slug}${product.isDecant ? '?format=decant' : ''}`;
  const promoLabel  = getPromoLabel(product.promoType, product.discountPct, product.promoValue);
  const promoColors = promoLabel ? (PROMO_COLORS[product.promoType] ?? null) : null;

  return (
    <div className="p-card">
      <Link to={productUrl} className="p-card__img-wrap">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="p-card__img"
        />
        <button
          className={`p-card__wish ${wished ? 'p-card__wish--active' : ''}`}
          onClick={e => { e.preventDefault(); onWishlistToggle ? onWishlistToggle(product) : toggle(product); }}
          aria-label="Agregar a favoritos"
        >
          <HeartIcon active={wished} />
        </button>
        {promoLabel && promoColors && (
          <span className="promo-chip p-card__promo-chip"
            style={{ color: promoColors.color, background: promoColors.bg, borderColor: promoColors.color }}>
            {promoLabel}
          </span>
        )}
        {product.minStock != null && product.minStock === 0 && (
          <span className="p-card__stock-badge p-card__stock-badge--out">
            Sin stock
          </span>
        )}
        {product.minStock != null && product.minStock > 0 && product.minStock <= 5 && (
          <span className="p-card__stock-badge">
            Últimas {product.minStock}
          </span>
        )}
      </Link>

      <Link to={productUrl} className="p-card__info">
        <span className="p-card__brand">{product.brand}</span>
        <span className="p-card__name">{product.name}</span>
        <div className="p-card__price-row">
          {product.comparePrice && (
            <span className="p-card__compare">{formatPrice(product.comparePrice)}</span>
          )}
          <span className="p-card__price">{formatPrice(product.price)}</span>
        </div>
      </Link>

      {showAddToCart && (
        <button
          className="p-card__add-to-cart"
          onClick={() => onAddToCart?.()}
        >
          Agregar a la bolsa
        </button>
      )}
    </div>
  );
}
