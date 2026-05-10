import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from './Navbar';
import BottomNavBar from './BottomNavBar';
import Footer from './Footer';
import './Layout.css';

const NO_FOOTER_PATHS = ['/cart', '/checkout'];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showFooter = !NO_FOOTER_PATHS.includes(pathname);

  const [newFragToast, setNewFragToast] = useState(null); // { name, slug }
  const toastTimer = useRef(null);

  useEffect(() => {
    const channel = supabase
      .channel('layout-new-fragrances')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'fragrances',
      }, (payload) => {
        const frag = payload.new;
        if (!frag?.name || !frag?.slug) return;
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setNewFragToast({ name: frag.name, slug: frag.slug });
        toastTimer.current = setTimeout(() => setNewFragToast(null), 7000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const dismissToast = () => {
    clearTimeout(toastTimer.current);
    setNewFragToast(null);
  };

  return (
    <>
      <Navbar />
      <main className={`layout__main${showFooter ? '' : ' layout__main--no-footer'}`}>
        <Outlet />
      </main>
      {showFooter && <Footer />}
      <BottomNavBar />

      {newFragToast && (
        <div
          className="layout-toast"
          role="alert"
          onClick={() => { navigate(`/product/${newFragToast.slug}`); dismissToast(); }}
        >
          <div className="layout-toast__body">
            <span className="layout-toast__eyebrow">Nueva fragancia</span>
            <strong className="layout-toast__name">{newFragToast.name}</strong>
            <span className="layout-toast__sub">¡Sé el primero en adquirirla!</span>
          </div>
          <div className="layout-toast__actions">
            <span className="layout-toast__btn">Ver ahora</span>
            <button
              type="button"
              className="layout-toast__close"
              onClick={e => { e.stopPropagation(); dismissToast(); }}
              aria-label="Cerrar"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
