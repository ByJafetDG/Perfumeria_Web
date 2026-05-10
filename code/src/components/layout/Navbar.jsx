import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import './Navbar.css';

const menuLinks = [
  {
    label: 'Inicio',
    to: '/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: 'Catálogo',
    to: '/catalog',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Buscar',
    to: '/search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="22" y2="22" />
      </svg>
    ),
  },
  {
    label: 'Deseados',
    to: '/wishlist',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    label: 'Cuenta',
    to: '/account',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: 'Mi Bolsa',
    to: '/cart',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { count } = useCart();

  // Cierra el menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Bloquea scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner">

          {/* Hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menú"
            aria-expanded={menuOpen}
          >
            <span className={`hamburger__bar ${menuOpen ? 'hamburger__bar--open' : ''}`} />
            <span className={`hamburger__bar ${menuOpen ? 'hamburger__bar--open' : ''}`} />
            <span className={`hamburger__bar ${menuOpen ? 'hamburger__bar--open' : ''}`} />
          </button>

          {/* Título centrado */}
          <span className="navbar__title">E L P E R F U M E R O 7 7 7</span>

          {/* Bolsa */}
          <Link to="/cart" className="navbar__bag" aria-label="Mi bolsa">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {count > 0 && (
              <span className="navbar__bag-badge">{count > 99 ? '99+' : count}</span>
            )}
          </Link>

        </div>
      </header>

      {/* Overlay menú */}
      <div
        className={`nav-overlay ${menuOpen ? 'nav-overlay--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <nav className={`nav-drawer ${menuOpen ? 'nav-drawer--open' : ''}`}>

        <div className="nav-drawer__top">
          <span className="nav-drawer__eyebrow">Menú</span>
        </div>

        <ul className="nav-drawer__list">
          {menuLinks.map(({ label, to, icon }, i) => {
            const active = pathname === to;
            return (
              <li
                key={to}
                className="nav-drawer__item"
                style={{ '--i': i }}
              >
                <Link
                  to={to}
                  className={`nav-drawer__link ${active ? 'nav-drawer__link--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-drawer__icon">{icon}</span>
                  <span className="nav-drawer__label">{label}</span>
                  {active && <span className="nav-drawer__dot" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="nav-drawer__bottom">
          <span className="nav-drawer__brand">El Perfumero 777</span>
        </div>

      </nav>
    </>
  );
}
