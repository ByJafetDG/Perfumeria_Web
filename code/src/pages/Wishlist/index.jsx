import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { fetchLargestPresentation } from '../../services/products';
import ProductCard from '../../components/ui/ProductCard/ProductCard';
import BackButton from '../../components/ui/BackButton/BackButton';
import './Wishlist.css';

export default function Wishlist() {
  const { items, toggle } = useWishlist();
  const { addItem } = useCart();
  const [removing, setRemoving] = useState({});

  const handleRemove = (product) => {
    setRemoving(prev => ({ ...prev, [product.id]: 'heart' }));
    setTimeout(() => {
      toggle(product);
      setRemoving(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }, 520);
  };

  const handleAddToCart = async (product) => {
    console.log('handleAddToCart called for:', product.id);
    const presentation = await fetchLargestPresentation(product.id);
    console.log('presentation:', presentation);
    if (!presentation) return;

    addItem({
      cartKey:  `${product.id}-botella-${presentation.id}`,
      productId: product.id,
      slug:      product.slug,
      name:      product.name,
      brand:     product.brand,
      imageUrl:  product.imageUrl,
      format:    'botella',
      size_ml:   presentation.size_ml,
      price:     presentation.price,
    });

    // Inicia animación de salida
    setRemoving(prev => ({ ...prev, [product.id]: true }));

    setTimeout(() => {
      toggle(product);
      setRemoving(prev => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }, 550);
  };

  return (
    <div className="wishlist-page">

      <BackButton />

      {/* ── Header ───────────────────────────────────────── */}
      <header className="wishlist-header">
        <h1 className="wishlist-header__title">Deseados</h1>
        <div className="wishlist-header__divider" />
        <div className="wishlist-header__tagline-wrap">
          <div className="wishlist-header__tagline-track">
            <span className="wishlist-header__tagline">Las esencias que tu alma desea</span>
            <span className="wishlist-header__tagline" aria-hidden="true">Las esencias que tu alma desea</span>
          </div>
        </div>
      </header>

      {/* ── Grid ─────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="wishlist-empty">
          <p className="wishlist-empty__text">
            Aún no has guardado ninguna fragancia.
          </p>
          <Link to="/catalog" className="wishlist-empty__cta">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <section className="wishlist-grid">
          {items.map(product => (
            <div
              key={product.id}
              className={`wishlist-card-wrap ${
                removing[product.id] === 'heart' ? 'wishlist-card-wrap--removing-heart' :
                removing[product.id]             ? 'wishlist-card-wrap--removing' : ''
              }`}
            >
              <ProductCard
                product={product}
                showAddToCart
                onAddToCart={() => handleAddToCart(product)}
                onWishlistToggle={() => handleRemove(product)}
              />
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
