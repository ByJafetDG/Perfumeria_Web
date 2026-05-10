import { useState, useRef } from 'react';

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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import './Auth.css';

const LOGO_URL =
  'https://bnigucvyjnolcubofvvf.supabase.co/storage/v1/object/public/store-assets/perfumero_logo_ups-removebg-preview.png';

function authError(msg) {
  if (!msg) return '';
  if (msg.includes('Invalid login credentials'))      return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed'))            return 'Confirma tu correo antes de ingresar.';
  if (msg.includes('User already registered'))        return 'Ya existe una cuenta con ese correo.';
  if (msg.includes('Password should be at least'))    return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('Unable to validate email'))       return 'El formato del correo no es válido.';
  if (msg.includes('For security purposes'))          return 'Espera un momento antes de volver a intentarlo.';
  return msg;
}

export default function Auth() {
  const { signIn, signUp, sendResetEmail } = useAuth();
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo    = searchParams.get('redirect') || '/';

  // face: 'login' | 'register' | 'forgot'
  const [face, setFace]         = useState('login');
  const [cardClass, setCardClass] = useState('');
  const flippingRef = useRef(false);

  const [loginData,    setLoginData]    = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', lastName: '', phone: '', email: '', password: '' });
  const [showLoginPwd,    setShowLoginPwd]    = useState(false);
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);
  const [forgotEmail,  setForgotEmail]  = useState('');

  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  // axis: 'y' = horizontal (login↔register), 'x' = vertical (login↔forgot)
  function flip(to, axis = 'y') {
    if (flippingRef.current || face === to) return;
    flippingRef.current = true;
    setError('');
    setSuccess('');

    const outClass   = axis === 'x' ? 'auth__card--flip-out-x'     : 'auth__card--flip-out-y';
    const startClass = axis === 'x' ? 'auth__card--flip-in-start-x' : 'auth__card--flip-in-start-y';

    setCardClass(outClass);
    setTimeout(() => {
      setFace(to);
      setCardClass(startClass);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCardClass('');
          setTimeout(() => { flippingRef.current = false; }, 420);
        });
      });
    }, 400);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user } = await signIn(loginData.email, loginData.password);
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(authError(err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user } = await signUp(
        registerData.email,
        registerData.password,
        registerData.name,
        registerData.lastName,
        registerData.phone,
      );
      // Si el email ya está confirmado (confirmación desactivada en Supabase),
      // navegar directamente; si no, mostrar mensaje.
      if (user?.email_confirmed_at) {
        navigate(redirectTo, { replace: true });
      } else {
        setSuccess('Revisa tu correo para confirmar tu cuenta.');
      }
    } catch (err) {
      setError(authError(err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await sendResetEmail(forgotEmail);
      setSuccess('Si ese correo existe, recibirás un enlace en breve.');
      setForgotEmail('');
    } catch (err) {
      setError(authError(err.message));
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = face === 'register';
  const isForgot   = face === 'forgot';

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

      {/* Card con flip */}
      <div className="auth__flip-wrapper">
        <div className={`auth__card ${cardClass} ${isRegister ? 'auth__card--register' : ''} ${isForgot ? 'auth__card--forgot' : ''}`}>
          <div className="auth__card-overlay" aria-hidden="true" />

          {/* ── LOGIN ── */}
          {face === 'login' && (
            <div className="auth__card-content">
              <div className="auth__heading">
                <h2 className="auth__title">Bienvenid@</h2>
                <p className="auth__subtitle">
                  Ingresa tus credenciales para acceder al catálogo
                </p>
              </div>

              <form className="auth__form" onSubmit={handleLogin}>
                <div className="auth__field">
                  <label className="auth__label" htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    className="auth__input"
                    placeholder="usuario@email.com"
                    value={loginData.email}
                    onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth__field">
                  <label className="auth__label" htmlFor="login-password">Contraseña</label>
                  <div className="auth__input-wrap">
                    <input
                      id="login-password"
                      type={showLoginPwd ? 'text' : 'password'}
                      className="auth__input"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className="auth__eye-btn" onClick={() => setShowLoginPwd(v => !v)}>
                      {showLoginPwd ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  <button type="button" className="auth__forgot" onClick={() => flip('forgot', 'x')}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {error && <p className="auth__error">{error}</p>}

                <button type="submit" className="auth__btn" disabled={submitting}>
                  <span>{submitting ? 'INGRESANDO…' : 'INGRESAR'}</span>
                </button>
              </form>

              <div className="auth__footer">
                <span className="auth__footer-text">¿Eres un usuario nuevo?</span>
                <button type="button" className="auth__footer-link" onClick={() => flip('register')}>
                  CREA UNA CUENTA
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTER ── */}
          {face === 'register' && (
            <div className="auth__card-content">
              <div className="auth__heading">
                <h2 className="auth__title">Crear cuenta</h2>
                <p className="auth__subtitle">
                  Completa tus datos para unirte al catálogo
                </p>
              </div>

              {success ? (
                <div className="auth__feedback">
                  <p className="auth__success">{success}</p>
                  <button type="button" className="auth__btn" onClick={() => flip('login')}>
                    <span>IR AL LOGIN</span>
                  </button>
                </div>
              ) : (
                <form className="auth__form auth__form--compact" onSubmit={handleRegister}>
                  <div className="auth__field">
                    <label className="auth__label" htmlFor="reg-name">Nombre</label>
                    <input
                      id="reg-name" type="text" className="auth__input" placeholder="Tu nombre"
                      value={registerData.name}
                      onChange={e => setRegisterData(p => ({ ...p, name: e.target.value }))}
                      autoComplete="given-name" required
                    />
                  </div>

                  <div className="auth__field">
                    <label className="auth__label" htmlFor="reg-lastname">Apellido</label>
                    <input
                      id="reg-lastname" type="text" className="auth__input" placeholder="Tu apellido"
                      value={registerData.lastName}
                      onChange={e => setRegisterData(p => ({ ...p, lastName: e.target.value }))}
                      autoComplete="family-name" required
                    />
                  </div>

                  <div className="auth__field">
                    <label className="auth__label" htmlFor="reg-phone">Teléfono</label>
                    <input
                      id="reg-phone" type="tel" className="auth__input" placeholder="+506 8888 8888"
                      value={registerData.phone}
                      onChange={e => setRegisterData(p => ({ ...p, phone: e.target.value }))}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="auth__field">
                    <label className="auth__label" htmlFor="reg-email">Correo</label>
                    <input
                      id="reg-email" type="email" className="auth__input" placeholder="usuario@email.com"
                      value={registerData.email}
                      onChange={e => setRegisterData(p => ({ ...p, email: e.target.value }))}
                      autoComplete="email" required
                    />
                  </div>

                  <div className="auth__field">
                    <label className="auth__label" htmlFor="reg-password">Contraseña</label>
                    <div className="auth__input-wrap">
                      <input
                        id="reg-password" type={showRegisterPwd ? 'text' : 'password'} className="auth__input" placeholder="••••••••"
                        value={registerData.password}
                        onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))}
                        autoComplete="new-password" required minLength={6}
                      />
                      <button type="button" className="auth__eye-btn" onClick={() => setShowRegisterPwd(v => !v)}>
                        {showRegisterPwd ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="auth__error">{error}</p>}

                  <button type="submit" className="auth__btn" disabled={submitting}>
                    <span>{submitting ? 'CREANDO…' : 'CREAR CUENTA'}</span>
                  </button>
                </form>
              )}

              <div className="auth__footer">
                <span className="auth__footer-text">¿Ya tienes cuenta?</span>
                <button type="button" className="auth__footer-link" onClick={() => flip('login')}>
                  INICIA SESIÓN
                </button>
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {face === 'forgot' && (
            <div className="auth__card-content">
              <div className="auth__heading">
                <h2 className="auth__title">Restablecer contraseña</h2>
                <p className="auth__subtitle">
                  Ingresa tu correo y te enviaremos un enlace para recuperar el acceso
                </p>
              </div>

              {success ? (
                <div className="auth__feedback">
                  <p className="auth__success">{success}</p>
                </div>
              ) : (
                <form className="auth__form" onSubmit={handleForgot}>
                  <div className="auth__field">
                    <label className="auth__label" htmlFor="forgot-email">Correo</label>
                    <input
                      id="forgot-email" type="email" className="auth__input" placeholder="usuario@email.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      autoComplete="email" required
                    />
                  </div>

                  {error && <p className="auth__error">{error}</p>}

                  <button type="submit" className="auth__btn" disabled={submitting}>
                    <span>{submitting ? 'ENVIANDO…' : 'ENVIAR ENLACE'}</span>
                  </button>
                </form>
              )}

              <div className="auth__footer">
                <span className="auth__footer-text">¿Recordaste tu contraseña?</span>
                <button type="button" className="auth__footer-link" onClick={() => flip('login', 'x')}>
                  VOLVER
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
