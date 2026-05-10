import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { fetchActiveBannerSlides } from '../../../services/banner';
import { useImageColor } from '../../../hooks/useImageColor';
import './HeroBanner.css';

const INTERVAL_MS = 4500;

// Fallback si CORS bloquea la extracción de color
const GRADIENT_BY_TYPE = {
  promotion:   'linear-gradient(135deg, #0a1a19 0%, #0d282d 50%, #0E0E0E 100%)',
  top_seller:  'linear-gradient(135deg, #1a1208 0%, #2d1f0a 50%, #0E0E0E 100%)',
  new_arrival: 'linear-gradient(135deg, #0a0f1a 0%, #0d1a2d 50%, #0E0E0E 100%)',
  featured:    'linear-gradient(135deg, #0f1a0a 0%, #1a2d0d 50%, #0E0E0E 100%)',
};

export default function HeroBanner() {
  const [slides, setSlides]     = useState([]);
  const [current, setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading]   = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchActiveBannerSlides()
      .then(setSlides)
      .catch(console.error)
      .finally(() => setLoading(false));

    const channel = supabase
      .channel('banner_slides_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banner_slides' },
        () => {
          // Cualquier cambio en la tabla → refetch completo para tener datos frescos
          fetchActiveBannerSlides()
            .then(setSlides)
            .catch(console.error);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const goTo = (index) => {
    if (animating || index === current) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 300);
  };

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(
      () => goTo((current + 1) % slides.length),
      INTERVAL_MS
    );
    return () => clearInterval(timerRef.current);
  }, [current, animating, slides.length]);

  // Hooks siempre antes de cualquier early return
  const imageUrl = slides[current]?.fragrances?.main_image_url ?? null;
  const extractedGradient = useImageColor(imageUrl);

  if (!loading && !slides.length) return null;

  if (loading) {
    return <section className="hero-banner hero-banner--skeleton" />;
  }

  const slide = slides[current];
  const bg = extractedGradient ?? GRADIENT_BY_TYPE[slide.type] ?? GRADIENT_BY_TYPE.featured;

  return (
    <section className="hero-banner">

      {/* Imagen difuminada de relleno (cubre espacios vacíos) */}
      <img
        src={imageUrl ?? ''}
        alt=""
        className="hero-banner__bg-blur"
        aria-hidden="true"
        style={{ display: imageUrl ? undefined : 'none' }}
      />

      {/* Imagen de producto en fondo */}
      <img
        src={imageUrl ?? ''}
        alt=""
        className={`hero-banner__bg-img ${animating ? 'hero-banner__bg-img--exit' : 'hero-banner__bg-img--enter'}`}
        aria-hidden="true"
        style={{ display: imageUrl ? undefined : 'none' }}
      />

      {/* Overlay de gradiente */}
      <div className="hero-banner__overlay" style={{ background: bg }} />

      <div className={`hero-banner__content ${animating ? 'hero-banner__content--exit' : 'hero-banner__content--enter'}`}>

        <span className="hero-banner__tag">{slide.label}</span>

        <h1 className="hero-banner__heading">{slide.headline}</h1>

        <p className="hero-banner__subtext">{slide.subtext}</p>

        {slide.discount_pct && (
          <span className="hero-banner__discount">-{slide.discount_pct}%</span>
        )}

        <Link to={slide.cta_link} className="hero-banner__btn">
          {slide.cta_text}
        </Link>

      </div>

      {slides.length > 1 && (
        <div className="hero-banner__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`hero-banner__dot ${i === current ? 'hero-banner__dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

    </section>
  );
}
