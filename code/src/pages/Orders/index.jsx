import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { OrderStatusTimeline } from '../Account';
import BackButton from '../../components/ui/BackButton/BackButton';
import './Orders.css';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke="#99907C" strokeWidth="1.6"/>
    <path d="M21 21l-4.35-4.35" stroke="#99907C" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [order,    setOrder]    = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);

  if (!authLoading && !user) {
    navigate('/login?redirect=/orders', { replace: true });
    return null;
  }

  async function handleTrack(e) {
    e.preventDefault();
    const num = query.trim().toUpperCase();
    if (!num || !user) return;

    setLoading(true);
    setSearched(false);
    setOrder(null);

    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, payment_provider, created_at')
      .eq('user_id', user.id)
      .ilike('order_number', num)
      .maybeSingle();

    setLoading(false);
    setSearched(true);
    setOrder(data ?? null);
  }

  return (
    <div className="orders-page">
      <div className="orders-page__inner">

        <div className="orders-page__header">
          <BackButton />
          <h1 className="orders-page__title">Rastrear Pedido</h1>
        </div>

        {/* ── Buscador ── */}
        <form className="orders-page__search" onSubmit={handleTrack}>
          <div className="orders-search__wrap">
            <SearchIcon />
            <input
              className="orders-search__input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Número de orden, ej. PF-260410123456"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            className="orders-search__btn"
            disabled={!query.trim() || loading}
          >
            {loading ? 'Buscando…' : 'Rastrear'}
          </button>
        </form>

        {/* ── Resultado ── */}
        {searched && !order && (
          <div className="orders-page__not-found">
            <p>No se encontró ninguna orden con ese número.</p>
            <span>Verifica que el número sea correcto y que la orden pertenezca a tu cuenta.</span>
          </div>
        )}

        {order && (
          <OrderStatusTimeline order={order} />
        )}

        {/* ── Hint cuando no han buscado ── */}
        {!searched && !loading && (
          <p className="orders-page__hint">
            Ingresa el número de orden que aparece en tu correo de confirmación para ver su estado en tiempo real.
          </p>
        )}

      </div>
    </div>
  );
}
