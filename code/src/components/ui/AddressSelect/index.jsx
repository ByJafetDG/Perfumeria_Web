import { useState, useEffect, useRef } from 'react';
import './AddressSelect.css';

export function AddressSelect({ label, value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function select(opt) {
    onChange(opt);
    setOpen(false);
  }

  return (
    <div className="addr-field" ref={ref}>
      <span className="addr-field__label">{label}</span>

      <button
        type="button"
        className={`addr-field__trigger ${disabled ? 'addr-field__trigger--disabled' : ''} ${open ? 'addr-field__trigger--open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className={`addr-field__value ${!value ? 'addr-field__value--placeholder' : ''}`}>
          {value || placeholder}
        </span>
        <svg
          className={`addr-field__chevron ${open ? 'addr-field__chevron--open' : ''}`}
          width="12" height="8" viewBox="0 0 12 8" fill="none"
        >
          <path d="M1 1L6 6.5L11 1" stroke="#D0C5AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className={`addr-field__menu ${open ? 'addr-field__menu--open' : ''}`}>
        <div className="addr-field__menu-inner">
          {options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              className={`addr-field__option ${opt === value ? 'addr-field__option--active' : ''}`}
              style={{ '--i': i }}
              onClick={() => select(opt)}
            >
              {opt === value && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="addr-field__check">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
