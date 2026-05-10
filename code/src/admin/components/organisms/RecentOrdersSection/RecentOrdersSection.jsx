import { useNavigate } from 'react-router-dom';
import OrderItem from '../../molecules/OrderItem/OrderItem';
import './RecentOrdersSection.css';

export default function RecentOrdersSection({ orders, loading }) {
  const navigate = useNavigate();

  return (
    <section className="recent-orders">
      <div className="recent-orders__header">
        <h2 className="recent-orders__title">Órdenes recientes</h2>
        <button className="recent-orders__link" onClick={() => navigate('/admin/orders')}>
          Ver todas
        </button>
      </div>

      <div className="recent-orders__list">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 96, background: '#1C1B1B' }} />
            ))
          : (orders ?? []).map(order => (
              <OrderItem
                key={order.id}
                order={order}
                onClick={() => navigate(`/admin/orders/${order.id}`)}
              />
            ))}
      </div>
    </section>
  );
}
