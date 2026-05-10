import './OrderItem.css';

const STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  paid:      'Pagado',
  shipped:   'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded:  'Reembolsado',
};

function fmt(amount) {
  return '₡' + Number(amount).toLocaleString('es-CR', { maximumFractionDigits: 0 });
}

function shortId(id) {
  return 'PF-' + id.slice(-6).toUpperCase();
}

export default function OrderItem({ order, onClick }) {
  const { firstName, lastName, total, status, id, imageUrl, itemCount } = order;

  return (
    <div className="order-item" onClick={onClick}>
      <div className="order-item__left">
        <div className="order-item__img-wrap">
          {imageUrl && (
            <img
              className="order-item__img"
              src={imageUrl}
              alt=""
              loading="lazy"
            />
          )}
        </div>
        <div className="order-item__info">
          <p className="order-item__name">{firstName} {lastName?.charAt(0)}.</p>
          <p className="order-item__ref">{shortId(id)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      <div className="order-item__right">
        <p className="order-item__total">{fmt(total)}</p>
        <span className={`order-item__badge order-item__badge--${status}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>
    </div>
  );
}
