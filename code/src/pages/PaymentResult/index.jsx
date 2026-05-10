import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import './PaymentResult.css';

const SuccessIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const FailIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#E57373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// Spinner CSS animation via className
const Spinner = () => (
  <div className="pay-result__spinner" aria-label="Cargando" />
);

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS        = 8; // ~32 segundos

export default function PaymentResult() {
  const [urlParams]    = useSearchParams();
  const navigate       = useNavigate();
  const { clearCart }  = useCart();

  // 'verifying' | 'success' | 'out_of_stock' | 'pending' | 'failed' | 'cancelled'
  const [state,       setState]       = useState('verifying');
  const [orderNumber, setOrderNumber] = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');
  const [retrying,    setRetrying]    = useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    async function run() {
      // ── 1. Recopilar todos los params que TiloPay pudo enviar ──────────
      const allParams = Object.fromEntries(urlParams.entries());
      console.log('[PaymentResult] URL params from TiloPay:', allParams);

      // Intentar los nombres de param más comunes de TiloPay
      const code      = urlParams.get('code')        ?? urlParams.get('responseCode');
      const tpt       = urlParams.get('tpt');
      const auth      = urlParams.get('auth');
      const orderHash = urlParams.get('orderHash');
      const orderNum  =
        urlParams.get('orderNumber')  ??
        urlParams.get('order_number') ??
        urlParams.get('ordernumber')  ??
        urlParams.get('OrderNumber');

      // ── 2. Rescatar la orden guardada antes de salir al pago ──────────
      let pending = null;
      try {
        const raw = localStorage.getItem('tilopay_pending');
        if (raw) pending = JSON.parse(raw);
      } catch (_) {}

      const wpCancel = urlParams.get('wp_cancel');

      const effectiveOrderNum = orderNum ?? pending?.orderNumber ?? urlParams.get('order') ?? null;
      console.log('[PaymentResult] effectiveOrderNum:', effectiveOrderNum, '| code:', code);

      // ── 2b. Usuario canceló en TiloPay ───────────────────────────────
      if (wpCancel === 'yes') {
        setOrderNumber(effectiveOrderNum ?? '');
        // Cancelar la orden en DB inmediatamente
        if (pending?.orderId) {
          try {
            const { data: sd } = await supabase.auth.getSession();
            const token = sd?.session?.access_token;
            if (token) {
              const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
              await fetch(`${apiUrl}/payments/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ orderId: pending.orderId }),
              });
            }
          } catch (_) {}
        }
        localStorage.removeItem('tilopay_pending');
        setState('cancelled');
        return;
      }

      if (!effectiveOrderNum) {
        // No hay ninguna forma de identificar la orden
        setState('failed');
        setErrorMsg('No se pudo identificar la orden. Por favor revisa tu cuenta.');
        return;
      }

      setOrderNumber(effectiveOrderNum);

      // ── 3. Si TiloPay envió code en la URL, llamar a verify ──────────
      if (code !== null) {
        const isApproved = code === '1' || code === 1 || code === '1101' || code === 1101;

        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (!token) throw new Error('No session');

          const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ orderNumber: effectiveOrderNum, code, tpt, auth, orderHash }),
          });
          const data = await res.json();

          if (data?.success) {
            await clearCart();
            localStorage.removeItem('tilopay_pending');
            if (data.outOfStock) {
              setErrorMsg(data.soldOutItem
                ? `"${data.soldOutItem}" se agotó mientras completabas tu pago.`
                : 'Un producto se agotó mientras completabas tu pago.');
              setState('out_of_stock');
            } else {
              setState('success');
            }
          } else {
            localStorage.removeItem('tilopay_pending');
            setState('failed');
            setErrorMsg('El pago fue rechazado por TiloPay. Verifica que tu cuenta bancaria tenga fondos suficientes, que los datos sean correctos o que el banco no haya bloqueado la transacción.');
          }
          return;
        } catch (err) {
          console.error('[PaymentResult] verify error:', err);
          // Servidor no disponible.
          // Si el código claramente NO es aprobado → cancelar orden directo + fallo inmediato.
          if (!isApproved) {
            await supabase
              .from('orders')
              .update({ status: 'cancelled', payment_status: 'failed' })
              .eq('order_number', effectiveOrderNum)
              .catch(() => {});
            localStorage.removeItem('tilopay_pending');
            setState('failed');
            setErrorMsg('El pago fue rechazado por TiloPay. Verifica que tu cuenta bancaria tenga fondos suficientes, que los datos sean correctos o que el banco no haya bloqueado la transacción.');
            return;
          }
          // Código aprobado pero servidor no disponible → polling para esperar webhook.
        }
      }

      // ── 4. Sin params de TiloPay → polling del estado en Supabase ────
      // TiloPay notifica al servidor vía webhook; puede llegar segundos después
      await pollUntilResolved(effectiveOrderNum);
    }

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRetry() {
    setRetrying(true);
    try {
      const raw = localStorage.getItem('tilopay_pending');
      if (!raw) { navigate('/checkout'); return; }
      const pending = JSON.parse(raw);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { navigate('/checkout'); return; }

      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ orderId: pending.orderId }),
      });
      const data = await res.json();

      if (!res.ok || !data?.paymentUrl) throw new Error(data?.error ?? 'Error al reintentar');

      window.location.href = data.paymentUrl;
    } catch (err) {
      console.error('[PaymentResult] retry error:', err);
      setRetrying(false);
      navigate('/checkout');
    }
  }

  async function pollUntilResolved(orderNum) {
    pollCount.current = 0;

    const check = async () => {
      pollCount.current += 1;
      console.log(`[PaymentResult] poll ${pollCount.current}/${MAX_POLLS} for ${orderNum}`);

      const { data: order } = await supabase
        .from('orders')
        .select('status, payment_status')
        .eq('order_number', orderNum)
        .single();

      if (order?.status === 'paid') {
        await clearCart();
        localStorage.removeItem('tilopay_pending');
        setState('success');
        return;
      }

      if (order?.status === 'cancelled') {
        localStorage.removeItem('tilopay_pending');
        setState('failed');
        setErrorMsg('El pago no fue completado.');
        return;
      }

      // Todavía pending/processing
      if (pollCount.current >= MAX_POLLS) {
        // Agotamos los reintentos; la orden está en revisión
        setState('pending');
        return;
      }

      setTimeout(check, POLL_INTERVAL_MS);
    };

    await check();
  }

  return (
    <div className="pay-result">
      <div className="pay-result__orb" aria-hidden="true" />

      <div className="pay-result__card">

        {/* ── Verificando ── */}
        {state === 'verifying' && (
          <>
            <Spinner />
            <h1 className="pay-result__title">Verificando pago</h1>
            <p className="pay-result__desc">
              Confirmando tu transacción con TiloPay, un momento…
            </p>
          </>
        )}

        {/* ── Éxito ── */}
        {state === 'success' && (
          <>
            <div className="pay-result__icon pay-result__icon--pop">
              <SuccessIcon />
            </div>
            <h1 className="pay-result__title">¡Pago exitoso!</h1>
            {orderNumber && <p className="pay-result__order-num">Orden #{orderNumber}</p>}
            <p className="pay-result__desc">
              Tu pago fue procesado correctamente. Puedes ver el estado de tu pedido en tu cuenta.
            </p>
            <button type="button" className="pay-result__btn" onClick={() => navigate('/account')}>
              Ver mis pedidos
            </button>
          </>
        )}

        {/* ── Pago OK pero sin stock ── */}
        {state === 'out_of_stock' && (
          <>
            <div className="pay-result__icon">
              <FailIcon />
            </div>
            <h1 className="pay-result__title pay-result__title--fail">Producto agotado</h1>
            {orderNumber && <p className="pay-result__order-num">Orden #{orderNumber}</p>}
            <p className="pay-result__desc">
              {errorMsg} Tu pago fue procesado, pero el producto se agotó justo antes de confirmar.
              No se realizará ningún cobro permanente — nos pondremos en contacto contigo para el reembolso.
            </p>
            <button type="button" className="pay-result__btn" onClick={() => navigate('/account')}>
              Ver mi cuenta
            </button>
          </>
        )}

        {/* ── En revisión (webhook aún no llegó) ── */}
        {state === 'pending' && (
          <>
            <div className="pay-result__icon">
              <ClockIcon />
            </div>
            <h1 className="pay-result__title">Pago en revisión</h1>
            {orderNumber && <p className="pay-result__order-num">Orden #{orderNumber}</p>}
            <p className="pay-result__desc">
              TiloPay procesó el pago pero la confirmación aún no ha llegado.
              Tu pedido aparecerá como pagado en tu cuenta en pocos minutos.
            </p>
            <div className="pay-result__actions">
              <button type="button" className="pay-result__btn" onClick={() => navigate('/account')}>
                Ir a mi cuenta
              </button>
              <button
                type="button"
                className="pay-result__btn pay-result__btn--ghost"
                onClick={() => pollUntilResolved(orderNumber)}
              >
                Verificar de nuevo
              </button>
            </div>
          </>
        )}

        {/* ── Cancelado (usuario volvió de TiloPay sin pagar) ── */}
        {state === 'cancelled' && (
          <>
            <div className="pay-result__icon">
              <FailIcon />
            </div>
            <h1 className="pay-result__title pay-result__title--fail">Pago cancelado</h1>
            {orderNumber && <p className="pay-result__order-num">Orden #{orderNumber}</p>}
            <p className="pay-result__desc">
              Cancelaste el pago. Tu carrito sigue guardado y puedes reintentar cuando quieras.
            </p>
            <div className="pay-result__actions">
              <button
                type="button"
                className={`pay-result__btn ${retrying ? 'pay-result__btn--disabled' : ''}`}
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? 'Redirigiendo…' : 'Reintentar pago'}
              </button>
              <button
                type="button"
                className="pay-result__btn pay-result__btn--ghost"
                onClick={() => navigate('/cart')}
              >
                Volver al carrito
              </button>
            </div>
          </>
        )}

        {/* ── Fallo ── */}
        {state === 'failed' && (
          <>
            <div className="pay-result__icon">
              <FailIcon />
            </div>
            <h1 className="pay-result__title pay-result__title--fail">Pago no completado</h1>
            {orderNumber && <p className="pay-result__order-num">Orden #{orderNumber}</p>}
            <p className="pay-result__desc">{errorMsg}</p>
            <div className="pay-result__actions">
              <button type="button" className="pay-result__btn" onClick={() => navigate('/checkout')}>
                Intentar de nuevo
              </button>
              <button
                type="button"
                className="pay-result__btn pay-result__btn--ghost"
                onClick={() => navigate('/cart')}
              >
                Volver al carrito
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
