import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchFragranceBySlug } from '../../services/products';
import { getPromoLabel, PROMO_COLORS } from '../../utils/promoUtils';
import BackButton from '../../components/ui/BackButton/BackButton';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchReviews, checkUserPurchased, checkUserReview, submitReview } from '../../services/reviews';
import { supabase } from '../../lib/supabase';
import './ProductDetail.css';

const formatPrice = p => `₡${Number(p).toLocaleString('es-CR')}`;

const LAYER_META = {
  top:   { label: 'Notas de Salida', Icon: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D0C5AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
    </svg>
  )},
  heart: { label: 'Corazón',         Icon: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D0C5AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21C12 21 3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 13-9 13z"/>
    </svg>
  )},
  base:  { label: 'Fondo',           Icon: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D0C5AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 6l4-4 4 4"/>
    </svg>
  )},
};

function StarRating({ value = 0 }) {
  const rounded = Math.round(value);
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i < rounded ? '#F2CA50' : 'none'}
          stroke="#F2CA50" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </>
  );
}

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="pd-star-picker">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        const active = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            className="pd-star-picker__star"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24"
              fill={active ? '#F2CA50' : 'none'}
              stroke="#F2CA50" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const formatParam = searchParams.get('format');
  const { user } = useAuth();
  const [fragrance, setFragrance]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [format, setFormat]           = useState('botella');
  const [selectedId, setSelectedId]   = useState(null);
  const [nameOverflows, setNameOverflows] = useState(false);
  const [pyramidOpen, setPyramidOpen]     = useState(true);
  const [descOpen, setDescOpen]           = useState(true);
  const [reviews, setReviews]               = useState([]);
  const [reviewsTotal, setReviewsTotal]     = useState(0);
  const [reviewsOffset, setReviewsOffset]   = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [avgRating, setAvgRating]           = useState(0);
  // Comment form
  const [canComment, setCanComment]         = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [formRating, setFormRating]         = useState(0);
  const [formComment, setFormComment]       = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState('');
  const [submitted, setSubmitted]           = useState(false);
  const [addedModal, setAddedModal] = useState({ show: false, closing: false, name: '', label: '' });
  const [viewers, setViewers] = useState(0);
  const addedTimerRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchFragranceBySlug(slug)
      .then(data => {
        setFragrance(data);
        const preferDecant = formatParam === 'decant' && data.decants.length > 0;
        if (preferDecant || (data.presentations.length === 0 && data.decants.length > 0)) {
          setFormat('decant');
          setSelectedId(data.decants[0]?.id ?? null);
        } else {
          setFormat('botella');
          setSelectedId(data.presentations[0]?.id ?? null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (nameRef.current) {
      setNameOverflows(nameRef.current.scrollWidth > nameRef.current.offsetWidth);
    }
  }, [fragrance]);

  // Check if authenticated user can leave a review
  useEffect(() => {
    if (!user || !fragrance) return;
    Promise.all([
      checkUserPurchased(user.id, fragrance.id),
      checkUserReview(user.id, fragrance.id),
    ]).then(([purchased, alreadyReviewed]) => {
      setCanComment(purchased && !alreadyReviewed);
    }).catch(() => {});
  }, [user, fragrance]);

  // Carga inicial de reviews + realtime
  useEffect(() => {
    if (!fragrance) return;

    fetchReviews(fragrance.id, 0).then(({ items, total, avgRating }) => {
      setReviews(items);
      setReviewsTotal(total);
      setReviewsOffset(items.length);
      setAvgRating(avgRating);
    }).catch(console.error);

    const channel = supabase
      .channel(`reviews:${fragrance.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reviews',
        filter: `fragrance_id=eq.${fragrance.id}`,
      }, async () => {
        const { items, total, avgRating } = await fetchReviews(fragrance.id, 0);
        setReviews(items);
        setReviewsTotal(total);
        setReviewsOffset(items.length);
        setAvgRating(avgRating);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fragrance]);

  // Realtime presence — count live viewers on this product page
  useEffect(() => {
    if (!fragrance) return;
    const channel = supabase.channel(`product-views:${fragrance.slug}`);
    channel
      .on('presence', { event: 'sync' }, () => {
        setViewers(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ at: Date.now() });
        }
      });
    return () => supabase.removeChannel(channel);
  }, [fragrance?.slug]);

  const { addItem } = useCart();

  // Cleanup timer on unmount
  useEffect(() => () => { if (addedTimerRef.current) clearTimeout(addedTimerRef.current); }, []);

  const closeAddedModal = () => {
    setAddedModal(m => ({ ...m, closing: true }));
    setTimeout(() => setAddedModal({ show: false, closing: false }), 380);
  };

  if (loading) return <div className="pd-loading" />;
  if (!fragrance) return null;

  const hasBottle   = fragrance.presentations.length > 0;
  const hasDecant   = fragrance.decants.length > 0;
  const hasBoth     = hasBottle && hasDecant;
  const currentOpts = format === 'botella' ? fragrance.presentations : fragrance.decants;

  const handleAddToCart = () => {
    const opt = currentOpts.find(o => o.id === selectedId);
    if (!opt) return;
    addItem({
      cartKey:  `${fragrance.id}-${format}-${opt.id}`,
      productId: fragrance.id,
      slug:      fragrance.slug,
      name:      fragrance.name,
      brand:     fragrance.brand,
      imageUrl:  fragrance.imageUrl,
      format,
      size_ml:   opt.size_ml,
      price:     opt.price,
    });
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    const label = format === 'decant' ? `Decant ${opt.size_ml} ml` : `Botella ${opt.size_ml} ml`;
    setAddedModal({ show: true, closing: false, name: fragrance.name, label });
    addedTimerRef.current = setTimeout(closeAddedModal, 3000);
  };

  const loadMoreReviews = async () => {
    if (reviewsLoading) return;
    setReviewsLoading(true);
    try {
      const { items } = await fetchReviews(fragrance.id, reviewsOffset);
      setReviews(prev => [...prev, ...items]);
      setReviewsOffset(o => o + items.length);
    } catch (e) { console.error(e); }
    finally { setReviewsLoading(false); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!formRating || !formComment.trim() || !user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitReview(user.id, fragrance.id, { rating: formRating, comment: formComment.trim() });
      setSubmitted(true);
      setShowForm(false);
      setCanComment(false);
    } catch (err) {
      setSubmitError(err.message ?? 'Error al enviar la reseña');
    } finally {
      setSubmitting(false);
    }
  };

  const switchFormat = (f) => {
    setFormat(f);
    const opts = f === 'botella' ? fragrance.presentations : fragrance.decants;
    setSelectedId(opts[0]?.id ?? null);
  };

  return (
    <div className="pd-page">

      <BackButton />

      {/* ── Imagen ───────────────────────────────────────── */}
      <div className="pd-image-section">
        <img src={fragrance.imageUrl} alt={fragrance.name} className="pd-image" />
      </div>

      {/* ── Product Identity ─────────────────────────────── */}
      <section className="pd-identity">

        {/* Marca */}
        <span className="pd-brand">{fragrance.brand}</span>

        {/* Nombre con marquee si desborda */}
        <div className="pd-name-wrap" ref={nameRef}>
          {nameOverflows ? (
            <div className="pd-name-track">
              <h1 className="pd-name">{fragrance.name}</h1>
              <h1 className="pd-name" aria-hidden="true">{fragrance.name}</h1>
            </div>
          ) : (
            <h1 className="pd-name">{fragrance.name}</h1>
          )}
        </div>

        {/* Estrellas */}
        <div className="pd-stars">
          <div className="pd-stars__icons">
            <StarRating value={avgRating} />
          </div>
          <span className="pd-review-count">
            {reviewsTotal} {reviewsTotal === 1 ? 'reseña' : 'reseñas'}
          </span>
          {viewers >= 1 && (
            <span className="pd-viewers">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {viewers} viendo
            </span>
          )}
        </div>

        {/* Chip de promoción activa */}
        {fragrance.promoType && (() => {
          const label  = getPromoLabel(fragrance.promoType, fragrance.discountPct, fragrance.promoValue);
          const colors = PROMO_COLORS[fragrance.promoType];
          if (!label || !colors) return null;
          return (
            <span className="promo-chip pd-promo-chip"
              style={{ color: colors.color, background: colors.bg, borderColor: colors.color }}>
              {label}
            </span>
          );
        })()}

        {/* Tabs formato */}
        {hasBoth && (
          <div className="pd-tabs">
            <button
              className={`pd-tab ${format === 'botella' ? 'pd-tab--active' : ''}`}
              onClick={() => switchFormat('botella')}
            >
              Botella
            </button>
            <button
              className={`pd-tab ${format === 'decant' ? 'pd-tab--active' : ''}`}
              onClick={() => switchFormat('decant')}
            >
              Decant
            </button>
          </div>
        )}

        {/* Selector de tamaño */}
        {currentOpts.length > 0 && (
          <div className="pd-sizes">
            {currentOpts.map(opt => (
              <button
                key={opt.id}
                className={`pd-size-btn ${selectedId === opt.id ? 'pd-size-btn--active' : ''}`}
                onClick={() => setSelectedId(opt.id)}
              >
                <span className="pd-size-btn__ml">{opt.size_ml} ml</span>
                <div className="pd-size-btn__price-wrap">
                  {opt.comparePrice && (
                    <span className="pd-size-btn__compare">{formatPrice(opt.comparePrice)}</span>
                  )}
                  <span className="pd-size-btn__price">{formatPrice(opt.price)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Botón agregar */}
        {selectedId && (() => {
          const opt = currentOpts.find(o => o.id === selectedId);
          const outOfStock = opt?.stock === 0;
          const label = format === 'decant' ? 'Decant' : 'Botella';
          return (
            <button
              className={`pd-add-btn ${outOfStock ? 'pd-add-btn--out' : ''}`}
              onClick={outOfStock ? undefined : handleAddToCart}
              disabled={outOfStock}
            >
              {outOfStock
                ? 'Sin stock'
                : opt ? `Agregar a la bolsa — ${label} ${opt.size_ml} ml` : 'Agregar a la bolsa'
              }
            </button>
          );
        })()}

        {/* Notas olfativas */}
        {fragrance.notes.length > 0 && (
          <div className="pd-notes">
            {fragrance.notes.map((n, i) => (
              <span key={i} className="pd-note-chip">{n.name}</span>
            ))}
          </div>
        )}

      </section>

      {/* ── Pirámide Olfativa ─────────────────────────────── */}
      {fragrance.notes.length > 0 && (
        <section className="pd-pyramid">

          <button className="pd-pyramid__header" onClick={() => setPyramidOpen(o => !o)}>
            <h2 className="pd-pyramid__title">Pirámide Olfativa</h2>
            <svg
              className={`pd-pyramid__chevron ${pyramidOpen ? 'pd-pyramid__chevron--open' : ''}`}
              width="12" height="8" viewBox="0 0 12 8" fill="none"
              stroke="#D0C5AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 1 6 7 11 1" />
            </svg>
          </button>

          {pyramidOpen && (
            <div className="pd-pyramid__layers">
              {(['top', 'heart', 'base']).map(layer => {
                const layerNotes = fragrance.notes.filter(n => n.layer === layer);
                if (!layerNotes.length) return null;
                const { label, Icon } = LAYER_META[layer];
                return (
                  <div key={layer} className="pd-pyramid__row">
                    <div className="pd-pyramid__icon-wrap">
                      <Icon />
                    </div>
                    <div className="pd-pyramid__info">
                      <span className="pd-pyramid__layer-label">{label}</span>
                      <span className="pd-pyramid__notes-text">
                        {layerNotes.map(n => n.name).join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>
      )}

      {/* ── Descripción ──────────────────────────────────── */}
      {fragrance.description && (
        <section className="pd-desc">
          <button className="pd-desc__header" onClick={() => setDescOpen(o => !o)}>
            <h2 className="pd-desc__title">Descripción</h2>
            <svg
              className={`pd-pyramid__chevron ${descOpen ? 'pd-pyramid__chevron--open' : ''}`}
              width="12" height="8" viewBox="0 0 12 8" fill="none"
              stroke="#D0C5AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 1 6 7 11 1" />
            </svg>
          </button>

          {descOpen && (
            <p className="pd-desc__body">{fragrance.description}</p>
          )}
        </section>
      )}

      {/* ── Reviews ──────────────────────────────────────── */}
      <section className="pd-reviews">
        <div className="pd-reviews__header">
          <h2 className="pd-reviews__title">Ecos de {fragrance.name}</h2>
          {canComment && !showForm && (
            <button className="pd-reviews__comment-btn" onClick={() => setShowForm(true)}>
              Comentar
            </button>
          )}
        </div>

        {submitted && (
          <p className="pd-review-form__success">
            Tu reseña fue enviada y está pendiente de aprobación. ¡Gracias!
          </p>
        )}

        {showForm && (
          <form className="pd-review-form" onSubmit={handleSubmitReview}>
            <StarPicker value={formRating} onChange={setFormRating} />
            <textarea
              className="pd-review-form__textarea"
              placeholder="Comparte tu experiencia con esta fragancia…"
              value={formComment}
              onChange={e => setFormComment(e.target.value)}
              rows={4}
              maxLength={600}
            />
            {submitError && <p className="pd-review-form__error">{submitError}</p>}
            <div className="pd-review-form__actions">
              <button
                type="submit"
                className="pd-review-form__submit"
                disabled={!formRating || !formComment.trim() || submitting}
              >
                {submitting ? 'Enviando…' : 'Enviar reseña'}
              </button>
              <button
                type="button"
                className="pd-review-form__cancel"
                onClick={() => { setShowForm(false); setSubmitError(''); }}
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className="pd-reviews__empty">Sé el primero en compartir tu experiencia.</p>
        ) : (
          <>
            <div className="pd-reviews__list">
              {reviews.map(r => (
                <div key={r.id} className="pd-review">
                  <div className="pd-review__stars">
                    <StarRating value={r.rating} />
                  </div>
                  <p className="pd-review__comment">"{r.comment}"</p>
                  <span className="pd-review__user">— {r.username.toUpperCase()}</span>
                </div>
              ))}
            </div>

            {reviews.length < reviewsTotal && (
              <button className="pd-reviews__more" onClick={loadMoreReviews} disabled={reviewsLoading}>
                {reviewsLoading ? 'Cargando…' : 'Ver más comentarios'}
              </button>
            )}
          </>
        )}
      </section>

      {/* ── Modal: Añadido a bolsa ────────────────────────── */}
      {addedModal.show && createPortal(
        <div
          className={`pd-added-overlay${addedModal.closing ? ' pd-added-overlay--out' : ''}`}
          onClick={closeAddedModal}
        >
          <div
            className={`pd-added-modal${addedModal.closing ? ' pd-added-modal--out' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="pd-added-modal__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#F2CA50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="pd-added-modal__title">¡Perfecto!</p>
            <p className="pd-added-modal__name">{addedModal.name}</p>
            <p className="pd-added-modal__sub">{addedModal.label} · añadido a tu bolsa</p>
            <button className="pd-added-modal__cta" onClick={closeAddedModal}>
              Genial, seguiré explorando
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
