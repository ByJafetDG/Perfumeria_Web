import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  fetchAllBannerSlides, upsertBannerSlide,
  deleteBannerSlide, swapSortOrder, searchFragrances,
} from '../../services/banners';
import './Banners.css';

// ── Constants ─────────────────────────────────────────────────
const TYPES = [
  { value: 'featured',    label: 'Destacado',    desc: 'Resalta un producto especial'        },
  { value: 'promotion',   label: 'Promoción',    desc: 'Anuncia una oferta o descuento'      },
  { value: 'top_seller',  label: 'Top Seller',   desc: 'Muestra tu producto más vendido'     },
  { value: 'coming_soon', label: 'Próximamente', desc: 'Genera expectativa sobre algo nuevo' },
];

const TYPE_COLORS = {
  featured:    { color: '#60A5FA', bg: 'rgba(30,58,138,0.35)'  },
  promotion:   { color: '#F2CA50', bg: 'rgba(81,69,45,0.5)'    },
  top_seller:  { color: '#4ADE80', bg: 'rgba(20,83,45,0.35)'   },
  coming_soon: { color: '#C084FC', bg: 'rgba(88,28,135,0.35)'  },
  new_arrival: { color: '#C084FC', bg: 'rgba(88,28,135,0.35)'  },
};

const PROMO_TYPES = [
  { value: 'porcentaje',      label: '% Descuento',    desc: 'Ej: −20% en la fragancia'       },
  { value: '2x1',             label: '2×1',            desc: 'Lleva 2, paga 1'                },
  { value: '3x2',             label: '3×2',            desc: 'Lleva 3, paga 2'                },
  { value: 'precio_especial', label: 'Precio especial', desc: 'Precio rebajado sin porcentaje' },
  { value: 'envio_gratis',    label: 'Envío gratis',   desc: 'Sin costo de envío al comprar'  },
  { value: 'regalo',          label: 'Regalo incluido', desc: 'Incluye obsequio con la compra' },
];

const LABEL_SUGGESTIONS = {
  featured:    ['DESTACADO', 'COLECCIÓN', 'ESPECIAL', 'EXCLUSIVO'],
  promotion:   ['OFERTA', 'DESCUENTO', '¡PROMO!', 'LIQUIDACIÓN'],
  top_seller:  ['TOP VENTAS', 'MÁS PEDIDO', 'FAVORITO', '#1'],
  coming_soon: ['PRÓXIMAMENTE', 'MUY PRONTO', 'NUEVO', 'COMING SOON'],
  new_arrival: ['PRÓXIMAMENTE', 'MUY PRONTO', 'NUEVO', 'COMING SOON'],
};

const ALL_PAGES = [
  { label: 'Catálogo completo', path: '/catalog'  },
  { label: 'Página de inicio',  path: '/'         },
  { label: 'Buscador',          path: '/search'   },
  { label: 'Lista de deseos',   path: '/wishlist' },
  { label: 'Mi cuenta',         path: '/account'  },
  { label: 'Carrito',           path: '/cart'     },
];

const EMPTY_FORM = {
  type: 'featured', label: '', headline: '', subtext: '',
  cta_text: '', cta_link: '/catalog',
  discount_pct: '', promo_type: 'porcentaje', promo_value: '',
  is_active: true, scheduled: false,
  fragrance_id: null, fragrance_name: '', fragrance_img: '', fragrance_slug: '',
  starts_at: '', ends_at: '',
};

const STEP_TITLES = ['Tipo de slide', 'Fragancia', 'Contenido', 'Botón de acción', 'Configurar promo', 'Configurar visibilidad', 'Vista previa'];

const DRAFT_KEY = 'perfumeria_banner_draft';

const TABS = [
  { id: 'todos',      label: 'Todos'       },
  { id: 'activo',     label: 'Activos'     },
  { id: 'programado', label: 'Programados' },
  { id: 'vencido',    label: 'Vencidos'    },
  { id: 'inactivo',   label: 'Inactivos'   },
];

function getSlideStatus(slide) {
  const now    = new Date();
  const ends   = slide.ends_at   ? new Date(slide.ends_at)   : null;
  const starts = slide.starts_at ? new Date(slide.starts_at) : null;
  if (ends && ends < now)                          return 'vencido';
  if (slide.is_active && starts && starts > now)   return 'programado';
  if (slide.is_active)                             return 'activo';
  return 'inactivo';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Fragrance picker ──────────────────────────────────────────
function FragrancePicker({ value, name, imageUrl, onChange }) {
  const [query,   setQuery]   = useState(name ?? '');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const ref   = useRef(null);
  const timer = useRef(null);

  useEffect(() => { setQuery(name ?? ''); }, [name]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      searchFragrances(q).then(r => { setResults(r); setOpen(true); }).catch(() => {});
    }, 220);
  }

  function handleSelect(frag) {
    setQuery(frag.name);
    setOpen(false);
    onChange({ id: frag.id, name: frag.name, img: frag.main_image_url, slug: frag.slug ?? '' });
  }

  function handleClear() {
    setQuery('');
    setOpen(false);
    onChange({ id: null, name: '', img: '', slug: '' });
  }

  return (
    <div className="ab-picker" ref={ref}>
      <div className="ab-picker__row">
        {imageUrl && <img src={imageUrl} alt="" className="ab-picker__thumb" />}
        <input
          className="ab-field__input"
          type="text"
          placeholder="Buscar fragancia por nombre..."
          value={query}
          onFocus={() => query && results.length && setOpen(true)}
          onChange={handleInput}
        />
        {value && (
          <button type="button" className="ab-picker__clear" onClick={handleClear}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="ab-picker__menu">
          {results.map(f => (
            <button key={f.id} type="button" className="ab-picker__item"
              onClick={() => handleSelect(f)}>
              {f.main_image_url && <img src={f.main_image_url} alt="" className="ab-picker__item-img" />}
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      className={`ab-toggle ${value ? 'ab-toggle--on' : ''}`}
      onClick={() => onChange(!value)}
      aria-label={value ? 'Desactivar' : 'Activar'}
    >
      <span className="ab-toggle__knob" />
    </button>
  );
}

// ── Step 1: Tipo ──────────────────────────────────────────────
function StepTipo({ form, set, onNext }) {
  return (
    <div className="ab-step-body">
      <p className="ab-step__desc">¿Qué tipo de slide quieres crear?</p>
      <div className="ab-type-cards">
        {TYPES.map(t => {
          const active = form.type === t.value;
          const colors = TYPE_COLORS[t.value];
          return (
            <button
              key={t.value}
              type="button"
              className={`ab-type-card ${active ? 'ab-type-card--active' : ''}`}
              style={active ? { borderColor: colors.color, background: colors.bg } : {}}
              onClick={() => { set('type', t.value); setTimeout(onNext, 150); }}
            >
              <span className="ab-type-card__dot" style={{ background: colors.color }} />
              <div className="ab-type-card__text">
                <span className="ab-type-card__name" style={active ? { color: colors.color } : {}}>
                  {t.label}
                </span>
                <span className="ab-type-card__desc">{t.desc}</span>
              </div>
              {active && (
                <svg className="ab-type-card__check" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Fragancia ─────────────────────────────────────────
function StepFragancia({ form, set, onNext }) {
  return (
    <div className="ab-step-body">
      <p className="ab-step__desc">
        Elige la fragancia que quieres destacar. Su imagen se usará como fondo del banner.
      </p>
      <FragrancePicker
        value={form.fragrance_id}
        name={form.fragrance_name}
        imageUrl={form.fragrance_img}
        onChange={({ id, name, img, slug }) => {
          set('fragrance_id',   id);
          set('fragrance_name', name);
          set('fragrance_img',  img);
          set('fragrance_slug', slug);
          if (id && slug) set('cta_link', `/product/${slug}`);
        }}
      />
      {form.fragrance_id && (
        <div className="ab-frag-selected">
          <img src={form.fragrance_img} alt="" className="ab-frag-selected__img" />
          <div className="ab-frag-selected__info">
            <span className="ab-frag-selected__name">{form.fragrance_name}</span>
            <span className="ab-frag-selected__hint">El botón se enlazará automáticamente a esta fragancia</span>
          </div>
        </div>
      )}
      <div className="ab-step__nav">
        <button type="button" className="ab-next-btn" onClick={onNext}>
          {form.fragrance_id
            ? `Continuar con ${form.fragrance_name.split(' ').slice(0, 3).join(' ')} →`
            : 'Continuar sin fragancia →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Contenido ─────────────────────────────────────────
function StepContenido({ form, set, onNext }) {
  const suggestions = LABEL_SUGGESTIONS[form.type] || [];
  const canNext = form.label.trim() && form.headline.trim();
  return (
    <div className="ab-step-body">
      <div className="ab-field">
        <span className="ab-field__label">Etiqueta <span className="ab-field__req">*</span></span>
        <p className="ab-field__desc">Chip pequeño que aparece encima del título</p>
        {suggestions.length > 0 && (
          <div className="ab-suggestions">
            {suggestions.map(s => (
              <button key={s} type="button"
                className={`ab-suggestion ${form.label === s ? 'ab-suggestion--active' : ''}`}
                onClick={() => set('label', s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <input className="ab-field__input" type="text"
          placeholder="Ej: NUEVA LLEGADA · PRIMAVERA 2025"
          value={form.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div className="ab-field">
        <span className="ab-field__label">Título <span className="ab-field__req">*</span></span>
        <input className="ab-field__input" type="text"
          placeholder={form.fragrance_name || 'Ej: Aqua di Gio · Verano 2025'}
          value={form.headline} onChange={e => set('headline', e.target.value)} />
      </div>
      <div className="ab-field">
        <span className="ab-field__label">Descripción</span>
        <textarea className="ab-field__input ab-field__textarea" rows={3}
          placeholder="Texto corto que aparece bajo el título (opcional)"
          value={form.subtext} onChange={e => set('subtext', e.target.value)} />
      </div>
      <div className="ab-step__nav">
        <button type="button" className="ab-next-btn" onClick={onNext} disabled={!canNext}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Botón de acción ───────────────────────────────────
function StepBoton({ form, set, onNext }) {
  const fragDest = form.fragrance_slug
    ? { label: `Ir a ${form.fragrance_name}`, path: `/product/${form.fragrance_slug}`, primary: true }
    : null;
  const destinations = [...(fragDest ? [fragDest] : []), ...ALL_PAGES];

  return (
    <div className="ab-step-body">
      <div className="ab-field">
        <span className="ab-field__label">Texto del botón</span>
        <input className="ab-field__input" type="text"
          placeholder="Ver fragancia"
          value={form.cta_text} onChange={e => set('cta_text', e.target.value)} />
      </div>
      <div className="ab-field">
        <span className="ab-field__label">Destino del botón</span>
        <p className="ab-field__desc">¿A dónde lleva el botón cuando alguien hace clic?</p>
        <div className="ab-dest-list">
          {destinations.map(d => (
            <button key={d.path} type="button"
              className={`ab-dest-item ${form.cta_link === d.path ? 'ab-dest-item--active' : ''} ${d.primary ? 'ab-dest-item--primary' : ''}`}
              onClick={() => set('cta_link', d.path)}>
              <span className="ab-dest-item__label">{d.label}</span>
              <span className="ab-dest-item__path">
                {d.path.length > 24 ? `${d.path.slice(0, 24)}…` : d.path}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="ab-step__nav">
        <button type="button" className="ab-next-btn" onClick={onNext}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Configurar promo ──────────────────────────────────
function StepConfigPromo({ form, set, onNext }) {
  return (
    <div className="ab-step-body">
      <div className="ab-field">
        <span className="ab-field__label">Tipo de promoción</span>
        <div className="ab-promo-grid">
          {PROMO_TYPES.map(p => (
            <button key={p.value} type="button"
              className={`ab-promo-card ${form.promo_type === p.value ? 'ab-promo-card--active' : ''}`}
              onClick={() => set('promo_type', p.value)}>
              <span className="ab-promo-card__label">{p.label}</span>
              <span className="ab-promo-card__desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
      {form.promo_type === 'porcentaje' && (
        <div className="ab-field">
          <span className="ab-field__label">Descuento (%)</span>
          <p className="ab-field__desc">Se mostrará como "−20%" sobre la imagen del banner</p>
          <input className="ab-field__input" type="number" min="0" max="100"
            placeholder="Ej: 20"
            value={form.discount_pct} onChange={e => set('discount_pct', e.target.value)} />
        </div>
      )}
      {form.promo_type === 'precio_especial' && (
        <div className="ab-field">
          <span className="ab-field__label">Precio especial</span>
          <p className="ab-field__desc">Precio que se mostrará en el banner</p>
          <input className="ab-field__input" type="text"
            placeholder="Ej: ₡59.900"
            value={form.promo_value} onChange={e => set('promo_value', e.target.value)} />
        </div>
      )}
      {form.promo_type === 'regalo' && (
        <div className="ab-field">
          <span className="ab-field__label">Descripción del regalo</span>
          <p className="ab-field__desc">¿Qué recibirá el cliente?</p>
          <input className="ab-field__input" type="text"
            placeholder="Ej: Mini perfume de cortesía"
            value={form.promo_value} onChange={e => set('promo_value', e.target.value)} />
        </div>
      )}
      {form.promo_type === 'envio_gratis' && (
        <p className="ab-promo-note">
          Este banner anuncia envío gratis. La lógica de costos de envío se configura por separado en ajustes de la tienda.
        </p>
      )}
      <div className="ab-step__nav">
        <button type="button" className="ab-next-btn" onClick={onNext}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ── Step 6: Configurar visibilidad ────────────────────────────
function StepConfigVisibilidad({ form, set, onNext }) {
  return (
    <div className="ab-step-body">
      <div className="ab-field ab-field--row">
        <div>
          <span className="ab-field__label">Slide activo</span>
          <p className="ab-field__desc">Visible en el carrusel de inicio</p>
        </div>
        <Toggle value={form.is_active} onChange={v => set('is_active', v)} />
      </div>
      <div className="ab-field ab-field--row">
        <div>
          <span className="ab-field__label">Programar visibilidad</span>
          <p className="ab-field__desc">Se activa y desactiva automáticamente por fechas</p>
        </div>
        <Toggle value={form.scheduled} onChange={v => {
          set('scheduled', v);
          if (!v) { set('starts_at', ''); set('ends_at', ''); }
        }} />
      </div>
      {form.scheduled && (
        <div className="ab-field-row">
          <div className="ab-field">
            <span className="ab-field__label">Visible desde</span>
            <input className="ab-field__input" type="datetime-local"
              value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
          </div>
          <div className="ab-field">
            <span className="ab-field__label">Visible hasta</span>
            <input className="ab-field__input" type="datetime-local"
              value={form.ends_at} onChange={e => set('ends_at', e.target.value)} />
          </div>
        </div>
      )}
      <div className="ab-step__nav">
        <button type="button" className="ab-next-btn" onClick={onNext}>
          Ver resumen →
        </button>
      </div>
    </div>
  );
}

// ── Step 6: Vista previa ──────────────────────────────────────
function StepResumen({ form, saving, err, onSave, isEdit }) {
  const typeInfo  = TYPES.find(t => t.value === form.type) ?? TYPES[0];
  const typeColor = TYPE_COLORS[form.type] ?? TYPE_COLORS.featured;
  const promoInfo = PROMO_TYPES.find(p => p.value === form.promo_type);
  const fragPath  = form.fragrance_slug ? `/product/${form.fragrance_slug}` : null;
  const destLabel = (fragPath && form.cta_link === fragPath)
    ? form.fragrance_name
    : (ALL_PAGES.find(p => p.path === form.cta_link)?.label ?? form.cta_link);

  return (
    <div className="ab-step-body">
      <p className="ab-step__desc">Revisa los detalles antes de publicar.</p>

      <div className="ab-review">
        {form.fragrance_img && (
          <div className="ab-review__visual">
            <img src={form.fragrance_img} alt="" className="ab-review__img" />
            <div className="ab-review__img-veil" />
          </div>
        )}
        <div className="ab-review__content">
          <div className="ab-review__badges">
            <span className="ab-review__badge"
              style={{ color: typeColor.color, background: typeColor.bg }}>
              {typeInfo.label}
            </span>
            {form.type === 'promotion' && promoInfo && (
              <span className="ab-review__badge ab-review__badge--promo">{promoInfo.label}</span>
            )}
            {form.type === 'promotion' && form.promo_type === 'porcentaje' && form.discount_pct && (
              <span className="ab-review__badge ab-review__badge--discount">−{form.discount_pct}%</span>
            )}
          </div>
          {form.label && <p className="ab-review__label">{form.label}</p>}
          <p className="ab-review__headline">{form.headline || '—'}</p>
          {form.subtext && <p className="ab-review__sub">{form.subtext}</p>}
          <div className="ab-review__cta">
            <span className="ab-review__cta-text">{form.cta_text || 'Ver fragancia'}</span>
            <span className="ab-review__cta-arrow">→</span>
            <span className="ab-review__cta-dest">{destLabel}</span>
          </div>
        </div>
      </div>

      <div className="ab-review__meta">
        <span className={`ab-review__meta-pill ${form.is_active ? 'ab-review__meta-pill--on' : ''}`}>
          {form.is_active ? 'Activo' : 'Inactivo'}
        </span>
        {form.scheduled && <span className="ab-review__meta-pill">Programado</span>}
        {form.fragrance_name && (
          <span className="ab-review__meta-pill">{form.fragrance_name}</span>
        )}
      </div>

      {err && <p className="ab-err">{err}</p>}

      <button type="button" className="ab-save-btn" disabled={saving} onClick={onSave}>
        {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Publicar slide'}
      </button>
    </div>
  );
}

// ── Slide wizard ──────────────────────────────────────────────
function SlideSheet({ slide, defaultOrder, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const animDir = useRef('fwd');

  const [form, setForm] = useState(() => {
    if (!slide) return { ...EMPTY_FORM };
    const rawType = slide.type;
    const type = rawType === 'new_arrival' ? 'coming_soon' : (rawType || 'featured');
    return {
      type,
      label:          slide.label          ?? '',
      headline:       slide.headline       ?? '',
      subtext:        slide.subtext        ?? '',
      cta_text:       slide.cta_text       ?? '',
      cta_link:       slide.cta_link       ?? '/catalog',
      discount_pct:   slide.discount_pct   ?? '',
      promo_type:     slide.promo_type     ?? 'porcentaje',
      promo_value:    slide.promo_value    ?? '',
      is_active:      slide.is_active,
      scheduled:      !!(slide.starts_at || slide.ends_at),
      fragrance_id:   slide.fragrance_id          ?? null,
      fragrance_name: slide.fragrances?.name      ?? '',
      fragrance_img:  slide.fragrances?.main_image_url ?? '',
      fragrance_slug: slide.fragrances?.slug      ?? '',
      starts_at:      slide.starts_at ? slide.starts_at.slice(0, 16) : '',
      ends_at:        slide.ends_at   ? slide.ends_at.slice(0, 16)   : '',
    };
  });

  const [saving,          setSaving]          = useState(false);
  const [err,             setErr]             = useState('');
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [savedDraft,      setSavedDraft]      = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const TOTAL = STEP_TITLES.length;

  // Check for draft on mount (new slides only)
  useEffect(() => {
    if (slide) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.form && (d.step > 0 || d.form.label || d.form.headline || d.form.fragrance_id)) {
          setSavedDraft(d);
          setShowDraftDialog(true);
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist draft on every change (new slides only)
  useEffect(() => {
    if (slide) return;
    const hasData = step > 0 || form.label || form.headline || form.fragrance_id;
    if (hasData) localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
  }, [form, step, slide]);

  function handleContinueDraft() {
    if (savedDraft) {
      setForm(savedDraft.form);
      setStep(savedDraft.step);
    }
    setShowDraftDialog(false);
  }

  function handleFreshStart() {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftDialog(false);
  }

  function goNext() {
    animDir.current = 'fwd';
    setStep(s => {
      const next = s + 1;
      if (next === 4 && form.type !== 'promotion') return 5;
      return Math.min(next, TOTAL - 1);
    });
  }

  function goBack() {
    if (step === 0) { onClose(); return; }
    animDir.current = 'bwd';
    setStep(s => {
      const prev = s - 1;
      if (prev === 4 && form.type !== 'promotion') return 3;
      return prev;
    });
  }

  async function handleSave() {
    if (!form.label.trim() || !form.headline.trim()) {
      setErr('Etiqueta y Título son obligatorios.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const isPromo = form.type === 'promotion';
      const payload = {
        type:         form.type,
        label:        form.label.trim(),
        headline:     form.headline.trim(),
        subtext:      form.subtext.trim(),
        cta_text:     form.cta_text.trim() || 'Ver fragancia',
        cta_link:     form.cta_link.trim() || '/catalog',
        discount_pct: isPromo && form.promo_type === 'porcentaje' && form.discount_pct !== ''
                        ? Number(form.discount_pct) : null,
        promo_type:   isPromo ? (form.promo_type || null) : null,
        promo_value:  isPromo && ['precio_especial', 'regalo'].includes(form.promo_type)
                        ? (form.promo_value.trim() || null) : null,
        sort_order:   slide ? slide.sort_order : defaultOrder,
        is_active:    form.is_active,
        fragrance_id: form.fragrance_id || null,
        starts_at:    form.scheduled && form.starts_at ? form.starts_at : new Date().toISOString(),
        ends_at:      form.scheduled ? (form.ends_at   || null) : null,
      };
      await upsertBannerSlide(slide?.id ?? null, payload);
      localStorage.removeItem(DRAFT_KEY);
      onSaved();
    } catch (e) {
      setErr(e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const progress = (step / (TOTAL - 1)) * 100;

  return (
    <div className="ab-overlay" onClick={onClose}>
      {showDraftDialog ? (
        <div className="ab-draft-dialog" onClick={e => e.stopPropagation()}>
          <div className="ab-draft-dialog__icon">✦</div>
          <p className="ab-draft-dialog__title">Slide sin terminar</p>
          <p className="ab-draft-dialog__msg">
            Dejaste un slide a medias. ¿Quieres retomarlo donde lo dejaste?
          </p>
          <div className="ab-draft-dialog__actions">
            <button type="button" className="ab-draft-dialog__btn" onClick={handleFreshStart}>
              Empezar de nuevo
            </button>
            <button type="button" className="ab-draft-dialog__btn ab-draft-dialog__btn--primary"
              onClick={handleContinueDraft}>
              Continuar →
            </button>
          </div>
        </div>
      ) : (
      <div className="ab-sheet" onClick={e => e.stopPropagation()}>
        <div className="ab-sheet__handle" />

        {/* Wizard header */}
        <div className="ab-wizard__header">
          <button type="button" className="ab-wizard__nav-btn" onClick={goBack} aria-label="Atrás">
            {step === 0 ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            )}
          </button>

          <div className="ab-wizard__center">
            <span className="ab-wizard__title">{STEP_TITLES[step]}</span>
            <div className="ab-wizard__dots">
              {STEP_TITLES
                .filter((_, i) => form.type === 'promotion' || i !== 4)
                .map((_, dotIdx) => {
                  const actual = (form.type !== 'promotion' && dotIdx >= 4) ? dotIdx + 1 : dotIdx;
                  return (
                    <span key={actual} className={`ab-wizard__dot
                      ${actual === step ? 'ab-wizard__dot--active' : ''}
                      ${actual < step  ? 'ab-wizard__dot--done'   : ''}`}
                    />
                  );
                })}
            </div>
          </div>

          <div style={{ width: 32 }} />
        </div>

        {/* Progress bar */}
        <div className="ab-wizard__track">
          <div className="ab-wizard__fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Animated step content */}
        <div className="ab-sheet__body">
          <div key={step} className={`ab-step ab-step--${animDir.current}`}>
            {step === 0 && <StepTipo             form={form} set={set} onNext={goNext} />}
            {step === 1 && <StepFragancia        form={form} set={set} onNext={goNext} />}
            {step === 2 && <StepContenido        form={form} set={set} onNext={goNext} />}
            {step === 3 && <StepBoton            form={form} set={set} onNext={goNext} />}
            {step === 4 && <StepConfigPromo      form={form} set={set} onNext={goNext} />}
            {step === 5 && <StepConfigVisibilidad form={form} set={set} onNext={goNext} />}
            {step === 6 && <StepResumen          form={form} saving={saving} err={err}
                              onSave={handleSave} isEdit={!!slide} />}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────
function DeleteModal({ slide, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  async function confirm() {
    setLoading(true);
    try { await deleteBannerSlide(slide.id); onDeleted(); }
    catch (e) { console.error(e); setLoading(false); }
  }
  return (
    <div className="ab-overlay ab-overlay--center" onClick={onClose}>
      <div className="ab-modal" onClick={e => e.stopPropagation()}>
        <p className="ab-modal__title">Eliminar slide</p>
        <p className="ab-modal__msg">
          ¿Eliminar <strong>"{slide.headline}"</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="ab-modal__actions">
          <button type="button" className="ab-modal__btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="ab-modal__btn ab-modal__btn--danger"
            onClick={confirm} disabled={loading}>
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Banner card ───────────────────────────────────────────────
function BannerCard({ slide, isFirst, isLast, onEdit, onDelete, onMoveUp, onMoveDown, onToggle }) {
  const cfg    = TYPE_COLORS[slide.type] ?? TYPE_COLORS.featured;
  const type   = TYPES.find(t => t.value === slide.type)?.label ?? slide.type;
  const img    = slide.fragrances?.main_image_url ?? null;
  const promo  = slide.type === 'promotion' && slide.promo_type
    ? PROMO_TYPES.find(p => p.value === slide.promo_type)?.label ?? slide.promo_type
    : null;
  const status = getSlideStatus(slide);

  return (
    <div className={`ab-card ${status === 'inactivo' || status === 'vencido' ? 'ab-card--inactive' : ''}`}>

      <div className="ab-card__img-wrap">
        {img
          ? <img src={img} alt={slide.headline} className="ab-card__img" />
          : <div className="ab-card__img-placeholder">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#4D4635" strokeWidth="1.2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
        }
      </div>

      <div className="ab-card__body">
        <div className="ab-card__top">
          <span className="ab-card__badge" style={{ color: cfg.color, background: cfg.bg }}>
            {type}
          </span>
          {promo && <span className="ab-card__promo">{promo}</span>}
          {!promo && slide.discount_pct && (
            <span className="ab-card__discount">-{slide.discount_pct}%</span>
          )}
          {status === 'vencido'    && <span className="ab-card__status-tag ab-card__status-tag--vencido">Vencido</span>}
          {status === 'programado' && <span className="ab-card__status-tag ab-card__status-tag--programado">Programado</span>}
          {status === 'inactivo'   && <span className="ab-card__status-tag">Inactivo</span>}
        </div>
        <p className="ab-card__label">{slide.label}</p>
        <p className="ab-card__headline">{slide.headline}</p>
        <p className="ab-card__sub">{slide.subtext}</p>
        {(slide.starts_at || slide.ends_at) && (
          <div className="ab-card__schedule">
            {slide.starts_at && <span>Desde {fmtDate(slide.starts_at)}</span>}
            {slide.ends_at   && <span>Hasta {fmtDate(slide.ends_at)}</span>}
          </div>
        )}
        <span className="ab-card__link">{slide.cta_link}</span>
      </div>

      <div className="ab-card__actions">
        <div className="ab-card__order">
          <button type="button" className="ab-card__order-btn"
            disabled={isFirst} onClick={onMoveUp}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <span className="ab-card__order-num">{slide.sort_order}</span>
          <button type="button" className="ab-card__order-btn"
            disabled={isLast} onClick={onMoveDown}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        <Toggle value={slide.is_active} onChange={onToggle} />

        <button type="button" className="ab-card__action-btn ab-card__action-btn--edit"
          onClick={onEdit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        <button type="button" className="ab-card__action-btn ab-card__action-btn--danger"
          onClick={onDelete}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Reactivate modal ──────────────────────────────────────────
function ReactivateModal({ slide, onClose, onReactivate }) {
  const [mode,    setMode]    = useState(null); // 'clear' | 'reschedule'
  const [starts,  setStarts]  = useState('');
  const [ends,    setEnds]    = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const payload = mode === 'clear'
        ? { is_active: true, starts_at: new Date().toISOString(), ends_at: null }
        : { is_active: true, starts_at: starts || new Date().toISOString(), ends_at: ends || null };
      await onReactivate(payload);
    } catch (e) { console.error(e); setLoading(false); }
  }

  return (
    <div className="ab-overlay ab-overlay--center" onClick={onClose}>
      <div className="ab-modal ab-modal--reactivate" onClick={e => e.stopPropagation()}>
        <p className="ab-modal__title">Reactivar banner</p>
        <p className="ab-modal__msg">
          <strong>"{slide.headline}"</strong> tiene fechas vencidas.
          ¿Cómo quieres reactivarlo?
        </p>

        {!mode && (
          <div className="ab-reactivate-opts">
            <button type="button" className="ab-reactivate-opt" onClick={() => setMode('clear')}>
              <span className="ab-reactivate-opt__title">Sin programación</span>
              <span className="ab-reactivate-opt__desc">Activo indefinidamente, sin fechas límite</span>
            </button>
            <button type="button" className="ab-reactivate-opt" onClick={() => setMode('reschedule')}>
              <span className="ab-reactivate-opt__title">Programar nuevas fechas</span>
              <span className="ab-reactivate-opt__desc">Define cuándo debe mostrarse</span>
            </button>
          </div>
        )}

        {mode === 'reschedule' && (
          <div className="ab-reactivate-dates">
            <div className="ab-field">
              <span className="ab-field__label">Visible desde (opcional)</span>
              <input className="ab-field__input" type="datetime-local"
                value={starts} onChange={e => setStarts(e.target.value)} />
            </div>
            <div className="ab-field">
              <span className="ab-field__label">Visible hasta (opcional)</span>
              <input className="ab-field__input" type="datetime-local"
                value={ends} onChange={e => setEnds(e.target.value)} />
            </div>
          </div>
        )}

        <div className="ab-modal__actions">
          {mode && (
            <button type="button" className="ab-modal__btn"
              onClick={() => setMode(null)} disabled={loading}>
              Atrás
            </button>
          )}
          {!mode && (
            <button type="button" className="ab-modal__btn"
              onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          )}
          {mode && (
            <button type="button" className="ab-modal__btn ab-modal__btn--primary"
              onClick={handleConfirm} disabled={loading}>
              {loading ? 'Guardando…' : 'Reactivar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminBanners() {
  const [slides,           setSlides]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [editTarget,       setEditTarget]       = useState(undefined);
  const [delTarget,        setDelTarget]        = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [activeTab,        setActiveTab]        = useState('todos');
  const [moving,           setMoving]           = useState(false);

  const load = useCallback(() => {
    fetchAllBannerSlides()
      .then(setSlides)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin-banners-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banner_slides' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  async function handleToggle(slide) {
    // Activar un slide vencido requiere decidir qué hacer con las fechas
    if (getSlideStatus(slide) === 'vencido' && !slide.is_active) {
      setReactivateTarget(slide);
      return;
    }
    try {
      await upsertBannerSlide(slide.id, { is_active: !slide.is_active });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, is_active: !s.is_active } : s));
    } catch (e) { console.error(e); }
  }

  async function handleReactivate(payload) {
    if (!reactivateTarget) return;
    try {
      await upsertBannerSlide(reactivateTarget.id, payload);
      setReactivateTarget(null);
      // Realtime subscription actualizará los slides
    } catch (e) { console.error(e); }
  }

  async function handleMove(idx, dir) {
    if (moving) return;
    const target   = slides[idx];
    const neighbor = slides[idx + dir];
    if (!neighbor) return;
    setMoving(true);
    try {
      await swapSortOrder(target.id, target.sort_order, neighbor.id, neighbor.sort_order);
      load();
    } catch (e) { console.error(e); }
    finally { setMoving(false); }
  }

  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.id] = tab.id === 'todos'
      ? slides.length
      : slides.filter(s => getSlideStatus(s) === tab.id).length;
    return acc;
  }, {});

  const visibleSlides = activeTab === 'todos'
    ? slides
    : slides.filter(s => getSlideStatus(s) === activeTab);

  return (
    <div className="ab-page">
      <section className="ab-header">
        <h1 className="ab-header__title">Banners</h1>
        <p className="ab-header__hint">
          Los slides activos aparecen en la página de inicio en el orden indicado.
        </p>
      </section>

      {/* ── Tabs ── */}
      <div className="ab-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`ab-tab ${activeTab === tab.id ? 'ab-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className={`ab-tab__count ${activeTab === tab.id ? 'ab-tab__count--active' : ''}`}>
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ab-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ab-card ab-card--skeleton" />
          ))}
        </div>
      ) : visibleSlides.length === 0 ? (
        <p className="ab-empty">
          {activeTab === 'todos' ? 'Sin slides aún. Crea el primero.' : `Sin banners ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()}.`}
        </p>
      ) : (
        <div className="ab-list">
          {visibleSlides.map((slide, i) => {
            const globalIdx = slides.indexOf(slide);
            return (
              <BannerCard
                key={slide.id}
                slide={slide}
                isFirst={globalIdx === 0}
                isLast={globalIdx === slides.length - 1}
                onEdit={() => setEditTarget(slide)}
                onDelete={() => setDelTarget(slide)}
                onToggle={() => handleToggle(slide)}
                onMoveUp={() => handleMove(globalIdx, -1)}
                onMoveDown={() => handleMove(globalIdx, 1)}
              />
            );
          })}
        </div>
      )}

      <button type="button" className="ab-fab" onClick={() => setEditTarget(null)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nuevo slide
      </button>

      {editTarget !== undefined && (
        <SlideSheet
          slide={editTarget}
          defaultOrder={slides.length}
          onClose={() => setEditTarget(undefined)}
          onSaved={() => { setEditTarget(undefined); load(); }}
        />
      )}

      {delTarget && (
        <DeleteModal
          slide={delTarget}
          onClose={() => setDelTarget(null)}
          onDeleted={() => { setDelTarget(null); load(); }}
        />
      )}

      {reactivateTarget && (
        <ReactivateModal
          slide={reactivateTarget}
          onClose={() => setReactivateTarget(null)}
          onReactivate={handleReactivate}
        />
      )}
    </div>
  );
}
