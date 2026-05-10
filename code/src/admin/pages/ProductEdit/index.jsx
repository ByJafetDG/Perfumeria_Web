import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  fetchFragranceForEdit, fetchBrands, fetchAllNotes, createBrand, createNote,
  uploadFragranceImage, upsertFragranceBasic, findOrCreateLine,
  savePresentations, saveDecants, saveFragranceNotes,
} from '../../services/productEdit';
import './ProductEdit.css';

const GENDER_OPTS = [
  { id: 'masculino', label: 'Hombre' },
  { id: 'femenino',  label: 'Mujer'  },
  { id: 'unisex',    label: 'Unisex' },
];
const CONC_OPTS = [
  { value: '',                label: '—'           },
  { value: 'parfum',          label: 'Parfum'      },
  { value: 'eau_de_parfum',   label: 'EDP'         },
  { value: 'eau_de_toilette', label: 'EDT'         },
  { value: 'eau_de_cologne',  label: 'EDC'         },
  { value: 'eau_fraiche',     label: 'Eau Fraîche' },
  { value: 'body_mist',       label: 'Body Mist'   },
];
const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23131313"%3E%3Crect width="400" height="400"/%3E%3C/svg%3E';

let _presKey = 0;
const presKey    = () => ++_presKey;
const emptyPres  = () => ({ _k: presKey(), id: null, sizeMl: '', price: '', comparePrice: '', stock: '0', isActive: true });
const emptyDecant= () => ({ _k: presKey(), id: null, sizeMl: '', price: '', stock: '0', isActive: true });

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ── Custom dropdown ───────────────────────────────────────────
function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const label = options.find(o => o.value === value)?.label ?? '—';

  return (
    <div className="pe-cselect" ref={ref}>
      <button type="button" className={`pe-cselect__trigger ${value ? 'pe-cselect__trigger--active' : ''}`}
        onClick={() => setOpen(o => !o)}>
        <span className="pe-cselect__value">{label}</span>
        <svg className={`pe-cselect__arrow ${open ? 'pe-cselect__arrow--open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="pe-cselect__menu">
          {options.map(opt => (
            <button key={opt.value || '__none__'} type="button"
              className={`pe-cselect__item ${value === opt.value ? 'pe-cselect__item--active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const BRAND_TYPE_OPTS = [
  { value: 'diseñador', label: 'Diseñador' },
  { value: 'nicho',     label: 'Nicho'     },
  { value: 'arabe',     label: 'Árabe'     },
  { value: 'celebridad',label: 'Celebridad'},
];

// ── Brand field ───────────────────────────────────────────────
function BrandField({ brandId, setBrandId, brands, brandMode, setBrandMode, newBrandName, setNewBrandName, newBrandType, setNewBrandType }) {
  if (brandMode === 'create') {
    return (
      <div className="pe-brand-create">
        <div className="pe-brand-new">
          <input
            className="pe-brand-new__input"
            type="text"
            value={newBrandName}
            onChange={e => setNewBrandName(e.target.value)}
            placeholder="Nombre de la marca…"
            autoFocus
          />
          <span className="pe-edit-hint"><PencilIcon /></span>
        </div>
        <div className="pe-brand-type-row">
          {BRAND_TYPE_OPTS.map(opt => (
            <button key={opt.value} type="button"
              className={`pe-brand-type-btn ${newBrandType === opt.value ? 'pe-brand-type-btn--active' : ''}`}
              onClick={() => setNewBrandType(opt.value)}>
              {opt.label}
            </button>
          ))}
          <button type="button" className="pe-brand-cancel"
            onClick={() => { setBrandMode('select'); setNewBrandName(''); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pe-brand-row">
      <CustomSelect
        value={brandId ?? ''}
        onChange={setBrandId}
        options={[
          { value: '', label: 'Seleccionar marca…' },
          ...brands.map(b => ({ value: b.id, label: b.name })),
        ]}
      />
      <button type="button" className="pe-brand-add"
        title="Nueva marca"
        onClick={() => { setBrandMode('create'); setBrandId(''); }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Accordion section ─────────────────────────────────────────
function Section({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="pe-section">
      <button className="pe-section__header" onClick={() => setOpen(o => !o)} type="button">
        <span className="pe-section__title">{title}</span>
        {badge != null && <span className="pe-section__badge">{badge}</span>}
        <svg className={`pe-section__chevron ${open ? 'pe-section__chevron--open' : ''}`}
          width="12" height="8" viewBox="0 0 12 8" fill="none"
          stroke="#D0C5AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 1 6 7 11 1"/>
        </svg>
      </button>
      {open && <div className="pe-section__body">{children}</div>}
    </section>
  );
}

// ── Presentation / Decant row ─────────────────────────────────
function PresRow({ row, onChange, onRemove, showCompare = false }) {
  const field = (key, val) => onChange({ ...row, [key]: val });
  return (
    <div className="pe-row">
      <div className="pe-row__fields">
        <div className="pe-field pe-field--sm">
          <label className="pe-field__label">ml</label>
          <input className="pe-field__input" type="number" min="1" value={row.sizeMl}
            onChange={e => field('sizeMl', e.target.value)} placeholder="100"/>
        </div>
        <div className="pe-field pe-field--md">
          <label className="pe-field__label">Precio ¢</label>
          <input className="pe-field__input" type="number" min="0" value={row.price}
            onChange={e => field('price', e.target.value)} placeholder="0"/>
        </div>
        {showCompare && (
          <div className="pe-field pe-field--md">
            <label className="pe-field__label">Precio comp.</label>
            <input className="pe-field__input" type="number" min="0" value={row.comparePrice}
              onChange={e => field('comparePrice', e.target.value)} placeholder="—"/>
          </div>
        )}
        <div className="pe-field pe-field--sm">
          <label className="pe-field__label">Stock</label>
          <input className="pe-field__input" type="number" min="0" value={row.stock}
            onChange={e => field('stock', e.target.value)} placeholder="0"/>
        </div>
        <div className="pe-field pe-field--toggle">
          <label className="pe-field__label">Activo</label>
          <button type="button"
            className={`pe-toggle ${row.isActive ? 'pe-toggle--on' : ''}`}
            onClick={() => field('isActive', !row.isActive)}
          />
        </div>
      </div>
      <button className="pe-row__remove" type="button" onClick={onRemove} aria-label="Eliminar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}

// ── Image controls ────────────────────────────────────────────
function ImageControls({ imgMode, setImgMode, imageUrl, setImageUrl, onFile, uploading, dragOver, setDragOver, fileInputRef }) {
  return (
    <div className="pe-img-controls">
      <div className="pe-img-toggle">
        <button type="button"
          className={`pe-img-toggle__btn ${imgMode === 'url' ? 'pe-img-toggle__btn--active' : ''}`}
          onClick={() => setImgMode('url')}>
          Enlace URL
        </button>
        <button type="button"
          className={`pe-img-toggle__btn ${imgMode === 'upload' ? 'pe-img-toggle__btn--active' : ''}`}
          onClick={() => setImgMode('upload')}>
          Subir archivo
        </button>
      </div>

      {imgMode === 'url' ? (
        <div key="url-mode" className="pe-field">
          <label className="pe-field__label">URL de imagen</label>
          <input
            className="pe-field__input"
            type="url"
            value={imageUrl ?? ''}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      ) : (
        <div key="upload-mode"
          className={`pe-dropzone ${dragOver ? 'pe-dropzone--over' : ''} ${uploading ? 'pe-dropzone--uploading' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <span className="pe-dropzone__text">Subiendo…</span>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
              <span className="pe-dropzone__text">Arrastra o haz clic para seleccionar</span>
              <span className="pe-dropzone__hint">JPG · PNG · WebP</span>
            </>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" hidden
            onChange={e => { const f = e.target.files[0]; if (f) onFile(f); }}/>
        </div>
      )}
    </div>
  );
}

// ── Note chip ─────────────────────────────────────────────────
function NoteChip({ note, onRemove }) {
  return (
    <div className="pe-note-chip">
      <span className="pe-note-chip__name">{note.noteName}</span>
      <button type="button" className="pe-note-chip__remove" onClick={onRemove} aria-label="Quitar">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

// ── Note autocomplete ─────────────────────────────────────────
function NoteAutocomplete({ onAdd, allNotes, usedIds, onNewNote }) {
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [creating, setCreating] = useState(false);
  const blurTimer = useRef(null);

  const trimmed  = query.trim();
  const filtered = allNotes
    .filter(n => !usedIds.has(n.id) && n.name.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, 7);
  const exactMatch = allNotes.some(n => n.name.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch;

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const handleSelect = (n) => {
    clearTimeout(blurTimer.current);
    onAdd({ noteId: n.id, noteName: n.name });
    setQuery('');
    setOpen(false);
  };

  const handleCreate = async () => {
    clearTimeout(blurTimer.current);
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const newNote = await onNewNote(trimmed);
      onAdd({ noteId: newNote.id, noteName: newNote.name });
      setQuery('');
      setOpen(false);
    } catch (e) {
      console.error('createNote:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (filtered.length > 0) handleSelect(filtered[0]);
    else if (showCreate)     handleCreate();
  };

  return (
    <div className="pe-note-autocomplete">
      <input
        type="text"
        className="pe-note-autocomplete__input"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Buscar o crear nota…"
      />
      {open && (filtered.length > 0 || showCreate) && (
        <div className="pe-note-autocomplete__menu">
          {filtered.map(n => (
            <button key={n.id} type="button" className="pe-note-autocomplete__item"
              onClick={() => handleSelect(n)}>
              <span>{n.name}</span>
              {n.family && <span className="pe-note-autocomplete__family">{n.family}</span>}
            </button>
          ))}
          {showCreate && (
            <button type="button" className="pe-note-autocomplete__create"
              onClick={handleCreate} disabled={creating}>
              {creating ? 'Creando…' : `+ Crear "${trimmed}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Success modal ─────────────────────────────────────────────
function SuccessModal({ action, fragName, onGo }) {
  return (
    <div className="pe-success-overlay" role="dialog" aria-modal="true">
      <div className="pe-success-modal">
        <div className="pe-success-modal__icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>
        <p className="pe-success-modal__title">
          {action === 'created' ? '¡Fragancia creada!' : '¡Cambios guardados!'}
        </p>
        <p className="pe-success-modal__name">{fragName}</p>
        <button type="button" className="pe-success-modal__btn" onClick={onGo}>
          Ir al inventario
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminProductEdit() {
  const { fragranceId } = useParams();
  const navigate = useNavigate();
  const isNew = fragranceId === 'new';
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const justSavedRef = useRef(false);
  const draftKey = `pe_draft_${fragranceId}`;

  const [name, setName]                   = useState('');
  const [brandId, setBrandId]             = useState('');
  const [brandMode, setBrandMode]         = useState('select');
  const [newBrandName, setNewBrandName]   = useState('');
  const [newBrandType, setNewBrandType]   = useState('diseñador');
  const [lineId, setLineId]               = useState(null);
  const [gender, setGender]               = useState('unisex');
  const [concentration, setConc]          = useState('');
  const [year, setYear]                   = useState('');
  const [isActive, setIsActive]           = useState(true);
  const [description, setDesc]            = useState('');

  const [imageUrl, setImageUrlState]      = useState('');
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setPreview]        = useState('');
  const [imgMode, setImgMode]             = useState('url');
  const [uploading, setUploading]         = useState(false);
  const [dragOver, setDragOver]           = useState(false);

  const [presentations, setPres]          = useState([emptyPres()]);
  const [removedPresIds, setRmPres]       = useState([]);
  const [decants, setDecants]             = useState([]);
  const [removedDecantIds, setRmDec]      = useState([]);

  const [pyramidTop, setPyramidTop]       = useState([]);
  const [pyramidHeart, setPyramidHeart]   = useState([]);
  const [pyramidBase, setPyramidBase]     = useState([]);

  const [brands, setBrands]               = useState([]);
  const [allNotes, setAllNotes]           = useState([]);
  const [loading, setLoading]             = useState(!isNew);
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');
  const [uploadToast, setUploadToast]     = useState(null); // { ok: bool, msg: string }
  const uploadToastTimer                  = useRef(null);
  const [realtimeBanner, setRealtimeBanner] = useState(false);
  const [draftBanner, setDraftBanner]       = useState(false);
  const [successModal, setSuccessModal]     = useState(null); // { action: 'created'|'updated', fragName }

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const applyDraft = useCallback((d) => {
    if (d.name          !== undefined) setName(d.name);
    if (d.brandId       !== undefined) setBrandId(d.brandId ?? '');
    if (d.brandMode     !== undefined) setBrandMode(d.brandMode);
    if (d.newBrandName  !== undefined) setNewBrandName(d.newBrandName);
    if (d.newBrandType  !== undefined) setNewBrandType(d.newBrandType);
    if (d.lineId        !== undefined) setLineId(d.lineId);
    if (d.gender        !== undefined) setGender(d.gender);
    if (d.concentration !== undefined) setConc(d.concentration ?? '');
    if (d.year          !== undefined) setYear(String(d.year ?? ''));
    if (d.isActive      !== undefined) setIsActive(d.isActive);
    if (d.description   !== undefined) setDesc(d.description);
    if (d.imageUrl      !== undefined) { setImageUrlState(d.imageUrl); setPreview(d.imageUrl); }
    if (d.imgMode       !== undefined) setImgMode(d.imgMode);
    if (d.presentations !== undefined) setPres(d.presentations.map(p => ({ ...p, _k: presKey() })));
    if (d.decants       !== undefined) setDecants(d.decants.map(d2 => ({ ...d2, _k: presKey() })));
    if (d.pyramidTop    !== undefined) setPyramidTop(d.pyramidTop);
    if (d.pyramidHeart  !== undefined) setPyramidHeart(d.pyramidHeart);
    if (d.pyramidBase   !== undefined) setPyramidBase(d.pyramidBase);
    if (d.removedPresIds    !== undefined) setRmPres(d.removedPresIds);
    if (d.removedDecantIds  !== undefined) setRmDec(d.removedDecantIds);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tryRestoreDraft = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return false;
      applyDraft(JSON.parse(raw));
      setDraftBanner(true);
      return true;
    } catch (_) { return false; }
  }, [draftKey, applyDraft]);

  useEffect(() => {
    fetchBrands().then(setBrands).catch(console.error);
    fetchAllNotes().then(setAllNotes).catch(console.error);

    if (isNew) {
      setLoading(false);
      tryRestoreDraft();
      return;
    }

    // Check for draft first — if found, skip the DB fetch (user has unsaved changes)
    const hasDraft = tryRestoreDraft();
    if (hasDraft) { setLoading(false); return; }

    setLoading(true);
    fetchFragranceForEdit(fragranceId)
      .then(f => {
        setName(f.name);
        setBrandId(f.brandId ?? '');
        setLineId(f.lineId);
        setGender(f.gender);
        setConc(f.concentration ?? '');
        setYear(f.year ?? '');
        setIsActive(f.isActive);
        setDesc(f.description);
        setImageUrlState(f.imageUrl);
        setPreview(f.imageUrl);
        setImgMode(f.imageUrl ? 'url' : 'upload');
        setPres(f.presentations.length
          ? f.presentations.map(p => ({ ...p, _k: presKey() }))
          : [emptyPres()]);
        setDecants(f.decants.map(d => ({ ...d, _k: presKey() })));
        setPyramidTop(f.notes.filter(n => n.layer === 'top'));
        setPyramidHeart(f.notes.filter(n => n.layer === 'heart'));
        setPyramidBase(f.notes.filter(n => n.layer === 'base'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fragranceId, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to sessionStorage (debounced 800ms)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({
          name, brandId, brandMode, newBrandName, newBrandType, lineId,
          gender, concentration, year, isActive, description,
          imageUrl, imgMode,
          presentations, decants,
          pyramidTop, pyramidHeart, pyramidBase,
          removedPresIds, removedDecantIds,
        }));
      } catch (_) {}
    }, 800);
    return () => clearTimeout(t);
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    loading, name, brandId, brandMode, newBrandName, newBrandType, lineId,
    gender, concentration, year, isActive, description,
    imageUrl, imgMode, presentations, decants,
    pyramidTop, pyramidHeart, pyramidBase, removedPresIds, removedDecantIds,
  ]);

  // Realtime — show banner when another device changes this fragrance
  useEffect(() => {
    if (isNew) return;
    const channel = supabase
      .channel(`pe-${fragranceId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'fragrances',
        filter: `id=eq.${fragranceId}`,
      }, () => { if (!justSavedRef.current) setRealtimeBanner(true); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'fragrance_notes',
        filter: `fragrance_id=eq.${fragranceId}`,
      }, () => { if (!justSavedRef.current) setRealtimeBanner(true); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fragranceId, isNew]);

  const showUploadToast = useCallback((ok, msg) => {
    if (uploadToastTimer.current) clearTimeout(uploadToastTimer.current);
    setUploadToast({ ok, msg });
    uploadToastTimer.current = setTimeout(() => setUploadToast(null), ok ? 4000 : 6000);
  }, []);

  const handleNewNote = useCallback(async (name) => {
    const newNote = await createNote(name);
    setAllNotes(prev => [...prev, newNote].sort((a, b) => a.name.localeCompare(b.name)));
    return newNote;
  }, []);

  const setImageUrl = useCallback((url) => {
    setImageUrlState(url);
    setPreview(url);
    setImageFile(null);
  }, []);

  const handleFile = useCallback(async (file) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setPreview(previewUrl);
    setImageUrlState('');
    setImageFile(null);
    setUploading(true);
    try {
      const publicUrl = await uploadFragranceImage(file);
      setImageUrlState(publicUrl);
      setPreview(publicUrl);
      setImageFile(null);
      if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
      showUploadToast(true, 'Imagen subida correctamente');
    } catch (e) {
      setPreview('');
      setImageUrlState('');
      showUploadToast(false, `Error al subir: ${e.message ?? 'intenta de nuevo'}`);
    } finally {
      setUploading(false);
    }
  }, [showUploadToast]);

  const updatePres = (idx, row) => setPres(prev => prev.map((p, i) => i === idx ? row : p));
  const removePres = (idx) => {
    const row = presentations[idx];
    if (row.id) setRmPres(prev => [...prev, row.id]);
    setPres(prev => prev.filter((_, i) => i !== idx));
  };
  const updateDec = (idx, row) => setDecants(prev => prev.map((d, i) => i === idx ? row : d));
  const removeDec = (idx) => {
    const row = decants[idx];
    if (row.id) setRmDec(prev => [...prev, row.id]);
    setDecants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) { setSaveError('El nombre es requerido.'); return; }
    if (brandMode === 'select' && !brandId) { setSaveError('Selecciona o crea una marca.'); return; }
    if (brandMode === 'create' && !newBrandName.trim()) { setSaveError('Escribe el nombre de la marca.'); return; }

    setSaving(true);
    setSaveError('');
    try {
      const finalImageUrl = imageUrl;

      let finalBrandId = brandId;
      if (brandMode === 'create') finalBrandId = await createBrand(newBrandName.trim(), newBrandType);
      const finalLineId = await findOrCreateLine(finalBrandId);

      justSavedRef.current = true;
      setTimeout(() => { justSavedRef.current = false; }, 4000);

      const savedId = await upsertFragranceBasic(fragranceId, {
        name: name.trim(), lineId: finalLineId, gender, description,
        concentration, year, isActive, imageUrl: finalImageUrl,
      });

      await savePresentations(savedId, presentations.filter(p => p.sizeMl && p.price), removedPresIds);
      await saveDecants(savedId, decants.filter(d => d.sizeMl && d.price), removedDecantIds);

      const allPyramidNotes = [
        ...pyramidTop.map(n => ({ noteId: n.noteId, layer: 'top' })),
        ...pyramidHeart.map(n => ({ noteId: n.noteId, layer: 'heart' })),
        ...pyramidBase.map(n => ({ noteId: n.noteId, layer: 'base' })),
      ];
      await saveFragranceNotes(savedId, allPyramidNotes);

      sessionStorage.removeItem(draftKey);
      setSuccessModal({ action: isNew ? 'created' : 'updated', fragName: name.trim() });
    } catch (e) {
      setSaveError(e.message ?? 'Error al guardar');
      setUploading(false);
      justSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pe-loading" />;

  const totalNotes = pyramidTop.length + pyramidHeart.length + pyramidBase.length;

  return (
    <div className="pe-page">

      {successModal && (
        <SuccessModal
          action={successModal.action}
          fragName={successModal.fragName}
          onGo={() => navigate('/admin/products')}
        />
      )}

      {uploadToast && (
        <div className={`pe-upload-toast ${uploadToast.ok ? 'pe-upload-toast--ok' : 'pe-upload-toast--err'}`}>
          {uploadToast.ok ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
          <span>{uploadToast.msg}</span>
        </div>
      )}

      <div className="pe-topbar">
        <button className="pe-topbar__back" onClick={() => navigate(-1)} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="pe-topbar__title">{isNew ? 'Nueva Fragancia' : 'Editar Fragancia'}</span>
        <div className="pe-topbar__spacer"/>
      </div>

      {draftBanner && (
        <div className="pe-draft-banner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="pe-draft-banner__text">Borrador restaurado</span>
          <button type="button" className="pe-draft-banner__discard"
            onClick={() => {
              sessionStorage.removeItem(draftKey);
              setDraftBanner(false);
              window.location.reload();
            }}>
            Descartar
          </button>
        </div>
      )}

      {realtimeBanner && (
        <div className="pe-realtime-banner">
          <span className="pe-realtime-banner__text">Cambios detectados desde otro dispositivo</span>
          <button type="button" className="pe-realtime-banner__reload"
            onClick={() => { setRealtimeBanner(false); window.location.reload(); }}>
            Recargar
          </button>
          <button type="button" className="pe-realtime-banner__close"
            onClick={() => setRealtimeBanner(false)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Image only ── */}
      <div className="pe-image-wrap">
        <img
          src={imagePreview || PLACEHOLDER_IMG}
          alt="Preview"
          className="pe-image"
          onError={e => { e.target.src = PLACEHOLDER_IMG; }}
        />
        {!imagePreview && (
          <div className="pe-image-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="#4D4635" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── Identity card ── */}
      <div className="pe-identity">

        <BrandField
          brandId={brandId} setBrandId={setBrandId}
          brands={brands}
          brandMode={brandMode} setBrandMode={setBrandMode}
          newBrandName={newBrandName} setNewBrandName={setNewBrandName}
          newBrandType={newBrandType} setNewBrandType={setNewBrandType}
        />

        <div className="pe-name-wrap">
          <input
            className="pe-name-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre de la fragancia"
          />
          <span className="pe-edit-hint pe-edit-hint--name"><PencilIcon /></span>
        </div>

        <div className="pe-row-inline">
          <div className="pe-field pe-field--flex">
            <label className="pe-field__label">Género</label>
            <div className="pe-gender-tabs">
              {GENDER_OPTS.map(g => (
                <button key={g.id} type="button"
                  className={`pe-gender-tab ${gender === g.id ? 'pe-gender-tab--active' : ''}`}
                  onClick={() => setGender(g.id)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pe-field pe-field--toggle">
            <label className="pe-field__label">Activo</label>
            <button type="button"
              className={`pe-toggle ${isActive ? 'pe-toggle--on' : ''}`}
              onClick={() => setIsActive(v => !v)}
            />
          </div>
        </div>

        <div className="pe-row-inline">
          <div className="pe-field pe-field--flex">
            <label className="pe-field__label">Concentración</label>
            <CustomSelect value={concentration} onChange={setConc} options={CONC_OPTS} />
          </div>
          <div className="pe-field pe-field--flex">
            <label className="pe-field__label">Año</label>
            <input className="pe-field__input" type="number" min="1900" max="2099"
              value={year} onChange={e => setYear(e.target.value)} placeholder="2024"/>
          </div>
        </div>

      </div>

      {/* ── Image controls ── */}
      <ImageControls
        imgMode={imgMode} setImgMode={setImgMode}
        imageUrl={imageUrl} setImageUrl={setImageUrl}
        onFile={handleFile}
        uploading={uploading}
        dragOver={dragOver} setDragOver={setDragOver}
        fileInputRef={fileInputRef}
      />

      <Section title="Descripción" defaultOpen={true}>
        <textarea
          className="pe-textarea"
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Describe la fragancia, su carácter, las ocasiones ideales…"
          rows={5}
        />
      </Section>

      <Section title="Pirámide Olfativa" badge={totalNotes || undefined} defaultOpen={false}>
        <div className="pe-pyramid-layer">
          <span className="pe-pyramid-layer__label">Salida</span>
          {pyramidTop.length > 0 && (
            <div className="pe-note-chips">
              {pyramidTop.map(n => (
                <NoteChip key={n.noteId} note={n}
                  onRemove={() => setPyramidTop(prev => prev.filter(x => x.noteId !== n.noteId))} />
              ))}
            </div>
          )}
          <NoteAutocomplete
            onAdd={n => setPyramidTop(prev => [...prev, n])}
            allNotes={allNotes}
            usedIds={new Set(pyramidTop.map(n => n.noteId))}
            onNewNote={handleNewNote}
          />
        </div>

        <div className="pe-pyramid-layer">
          <span className="pe-pyramid-layer__label">Corazón</span>
          {pyramidHeart.length > 0 && (
            <div className="pe-note-chips">
              {pyramidHeart.map(n => (
                <NoteChip key={n.noteId} note={n}
                  onRemove={() => setPyramidHeart(prev => prev.filter(x => x.noteId !== n.noteId))} />
              ))}
            </div>
          )}
          <NoteAutocomplete
            onAdd={n => setPyramidHeart(prev => [...prev, n])}
            allNotes={allNotes}
            usedIds={new Set(pyramidHeart.map(n => n.noteId))}
            onNewNote={handleNewNote}
          />
        </div>

        <div className="pe-pyramid-layer">
          <span className="pe-pyramid-layer__label">Fondo</span>
          {pyramidBase.length > 0 && (
            <div className="pe-note-chips">
              {pyramidBase.map(n => (
                <NoteChip key={n.noteId} note={n}
                  onRemove={() => setPyramidBase(prev => prev.filter(x => x.noteId !== n.noteId))} />
              ))}
            </div>
          )}
          <NoteAutocomplete
            onAdd={n => setPyramidBase(prev => [...prev, n])}
            allNotes={allNotes}
            usedIds={new Set(pyramidBase.map(n => n.noteId))}
            onNewNote={handleNewNote}
          />
        </div>
      </Section>

      <Section title="Presentaciones (Botellas)" badge={presentations.length}>
        {presentations.map((p, i) => (
          <PresRow key={p._k} row={p} showCompare
            onChange={row => updatePres(i, row)}
            onRemove={() => removePres(i)}
          />
        ))}
        <button className="pe-add-row" type="button"
          onClick={() => setPres(prev => [...prev, emptyPres()])}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Agregar presentación
        </button>
      </Section>

      <Section title="Decants" badge={decants.length} defaultOpen={false}>
        {decants.map((d, i) => (
          <PresRow key={d._k} row={d}
            onChange={row => updateDec(i, row)}
            onRemove={() => removeDec(i)}
          />
        ))}
        <button className="pe-add-row" type="button"
          onClick={() => setDecants(prev => [...prev, emptyDecant()])}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Agregar decant
        </button>
      </Section>

      {saveError && <p className="pe-error">{saveError}</p>}

      <div className="pe-save-wrap">
        <button className="pe-save-btn" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : isNew ? 'Crear Fragancia' : 'Guardar Cambios'}
        </button>
      </div>

    </div>
  );
}
