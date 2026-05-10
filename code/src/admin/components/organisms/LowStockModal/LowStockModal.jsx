import { useEffect } from 'react';
import './LowStockModal.css';

export default function LowStockModal({ items, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="low-stock-modal__backdrop" onClick={onClose}>
      <div className="low-stock-modal" onClick={e => e.stopPropagation()}>
        <div className="low-stock-modal__header">
          <div>
            <h2 className="low-stock-modal__title">Stock crítico</h2>
            <p className="low-stock-modal__subtitle">{items.length} botella{items.length !== 1 ? 's' : ''} con 5 unidades o menos</p>
          </div>
          <button className="low-stock-modal__close" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="low-stock-modal__list">
          {items.map(item => {
            const fragrance = item.fragrances;
            const brand = fragrance?.lines?.brands?.name ?? '';
            const stockClass = item.stock === 0 ? 'zero' : item.stock <= 2 ? 'low' : 'ok';

            return (
              <div key={item.id} className="low-stock-modal__item">
                <div className="low-stock-modal__img-wrap">
                  {fragrance?.main_image_url && (
                    <img
                      className="low-stock-modal__img"
                      src={fragrance.main_image_url}
                      alt=""
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="low-stock-modal__info">
                  <p className="low-stock-modal__name">{fragrance?.name ?? '—'}</p>
                  {brand && <p className="low-stock-modal__brand">{brand}</p>}
                  <p className="low-stock-modal__size">{item.size_ml} ml</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`low-stock-modal__stock low-stock-modal__stock--${stockClass}`}>
                    {item.stock}
                  </span>
                  <span className="low-stock-modal__stock-label">uds.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
