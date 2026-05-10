import { useState, useEffect } from 'react';

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import '../Auth/Auth.css';

const LOGO_URL =
  'https://bnigucvyjnolcubofvvf.supabase.co/storage/v1/object/public/store-assets/perfumero_logo_ups-removebg-preview.png';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [formData,   setFormData]   = useState({ password: '', confirm: '' });
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // ready = sesión de recuperación establecida
  const [ready,      setReady]      = useState(false);

  useEffect(() => {
    // Supabase intercambia el code automáticamente al inicializar.
    // Verificamos si ya hay sesión activa al montar.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Por si el evento llega después (flujos más lentos)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(formData.password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      {/* Fondo animado */}
      <div className="auth__bg" aria-hidden="true">
        <img src={LOGO_URL} alt="" className="auth__bg-logo" draggable={false} />
        <div className="auth__bg-glow" />
        <div className="auth__bg-orb auth__bg-orb--1" />
        <div className="auth__bg-orb auth__bg-orb--2" />
        <div className="auth__bg-shimmer" />
      </div>

      {/* Header de marca */}
      <header className="auth__header">
        <h1 className="auth__brand">EL PERFUMERO 777</h1>
        <p className="auth__tagline">OLER MAL NO ES UNA OPCIÓN</p>
      </header>

      {/* Card */}
      <div className="auth__flip-wrapper">
        <div className="auth__card auth__card--forgot">
          <div className="auth__card-overlay" aria-hidden="true" />

          <div className="auth__card-content">
            <div className="auth__heading">
              <h2 className="auth__title">Nueva contraseña</h2>
              <p className="auth__subtitle">
                Crea una contraseña segura para tu cuenta
              </p>
            </div>

            {!ready && !error && !success ? (
              <p className="auth__subtitle" style={{ textAlign: 'center', marginTop: 24 }}>
                Verificando enlace…
              </p>
            ) : success ? (
              <div className="auth__feedback">
                <p className="auth__success">
                  ¡Contraseña actualizada! Ya puedes ingresar.
                </p>
                <button className="auth__btn" onClick={() => navigate('/login', { replace: true })}>
                  <span>IR AL LOGIN</span>
                </button>
              </div>
            ) : error && !ready ? (
              <div className="auth__feedback">
                <p className="auth__error">{error}</p>
                <button className="auth__btn" onClick={() => navigate('/login')}>
                  <span>VOLVER AL LOGIN</span>
                </button>
              </div>
            ) : (
              <form className="auth__form" onSubmit={handleSubmit}>
                <div className="auth__field">
                  <label className="auth__label" htmlFor="rp-password">
                    Nueva contraseña
                  </label>
                  <div className="auth__input-wrap">
                    <input
                      id="rp-password" type={showPwd ? 'text' : 'password'} className="auth__input"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password" required minLength={6}
                    />
                    <button type="button" className="auth__eye-btn" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div className="auth__field">
                  <label className="auth__label" htmlFor="rp-confirm">
                    Confirmar contraseña
                  </label>
                  <div className="auth__input-wrap">
                    <input
                      id="rp-confirm" type={showConfirm ? 'text' : 'password'} className="auth__input"
                      placeholder="••••••••"
                      value={formData.confirm}
                      onChange={e => setFormData(p => ({ ...p, confirm: e.target.value }))}
                      autoComplete="new-password" required
                    />
                    <button type="button" className="auth__eye-btn" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {error && <p className="auth__error">{error}</p>}

                <button type="submit" className="auth__btn" disabled={submitting}>
                  <span>{submitting ? 'GUARDANDO…' : 'RESTABLECER'}</span>
                </button>
              </form>
            )}

            <div className="auth__footer">
              <span className="auth__footer-text">¿Ya recordaste tu contraseña?</span>
              <button type="button" className="auth__footer-link" onClick={() => navigate('/login')}>
                INICIA SESIÓN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
