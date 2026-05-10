import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchCategories } from '../../../services/categories';
import './CategoryScroll.css';

const GENDER_OPTS = [
  { id: 'masculino', label: 'Hombre' },
  { id: 'femenino',  label: 'Mujer'  },
  { id: 'unisex',   label: 'Unisex' },
];

function FilterDropdown({ label, activeLabel, options, onSelect, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="cat-dropdown" ref={ref}>
      <button
        className={`cat-dropdown__trigger ${isActive ? 'cat-dropdown__trigger--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="cat-dropdown__label">{label}</span>
        <span className="cat-dropdown__value">{activeLabel}</span>
        <svg
          className={`cat-dropdown__arrow ${open ? 'cat-dropdown__arrow--open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="cat-dropdown__menu">
          {options.map(opt => (
            <button
              key={opt.id ?? 'all'}
              className={`cat-dropdown__item ${opt.active ? 'cat-dropdown__item--active' : ''}`}
              onClick={() => { onSelect(opt.id); setOpen(false); }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryScroll() {
  const [categories, setCategories] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeType   = searchParams.get('type');
  const activeGender = searchParams.get('gender');

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  if (!categories.length) return null;

  const buildUrl = (typeVal, genderVal) => {
    const p = new URLSearchParams();
    if (typeVal)   p.set('type', typeVal);
    if (genderVal) p.set('gender', genderVal);
    const str = p.toString();
    return `/catalog${str ? '?' + str : ''}`;
  };

  const selectType   = (val) => navigate(buildUrl(val, activeGender));
  const selectGender = (val) => navigate(buildUrl(activeType, val));

  const typeLabel = categories.find(c => c.id === activeType)?.label ?? 'Todos';
  const genderLabel = GENDER_OPTS.find(g => g.id === activeGender)?.label ?? 'Todos';

  const typeOptions = [
    { id: null, label: 'Todos', active: !activeType },
    ...categories.map(c => ({ id: c.id, label: c.label, active: activeType === c.id })),
  ];

  const genderOptions = [
    { id: null, label: 'Todos', active: !activeGender },
    ...GENDER_OPTS.map(g => ({ id: g.id, label: g.label, active: activeGender === g.id })),
  ];

  return (
    <section className="cat-scroll">
      <FilterDropdown
        label="Categoría"
        activeLabel={typeLabel}
        options={typeOptions}
        onSelect={selectType}
        isActive={!!activeType}
      />
      <FilterDropdown
        label="Género"
        activeLabel={genderLabel}
        options={genderOptions}
        onSelect={selectGender}
        isActive={!!activeGender}
      />
    </section>
  );
}
