import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchFeaturedFragrances } from '../../../services/products';
import ProductCard from '../ProductCard/ProductCard';
import './FeaturedProducts.css';

export default function FeaturedProducts() {
  const [fragrances, setFragrances] = useState([]);

  useEffect(() => {
    fetchFeaturedFragrances().then(setFragrances).catch(console.error);
  }, []);

  if (!fragrances.length) return null;

  return (
    <section className="featured">
      <div className="featured__header">
        <h2 className="featured__title">Catálogo</h2>
        <Link to="/catalog" className="featured__view-all">Ver todo</Link>
      </div>

      <div className="featured__grid">
        {fragrances.map(f => (
          <ProductCard key={f.id} product={f} />
        ))}
      </div>
    </section>
  );
}
