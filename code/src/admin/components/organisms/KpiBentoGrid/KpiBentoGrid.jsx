import KpiCard from '../../molecules/KpiCard/KpiCard';
import './KpiBentoGrid.css';

function fmt(amount) {
  return '₡' + Number(amount).toLocaleString('es-CR', { maximumFractionDigits: 0 });
}

const IconMoney = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
    <rect x="0" y="0" width="22" height="16" rx="2" stroke="#F2CA50" strokeWidth="1.5" />
    <circle cx="11" cy="8" r="3" stroke="#F2CA50" strokeWidth="1.5" />
    <line x1="4" y1="8" x2="5" y2="8" stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="17" y1="8" x2="18" y2="8" stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPackage = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E5E2E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconWarning = () => (
  <svg width="22" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFB4AB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconUsers = () => (
  <svg width="24" height="16" viewBox="0 0 24 24" fill="none" stroke="#E5E2E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function KpiBentoGrid({ kpis, loading, onVentasClick, onPedidosClick, onStockClick, onVentasMesClick }) {
  const cards = [
    {
      label: 'Ventas hoy',
      value: loading ? '—' : fmt(kpis?.ventasHoy ?? 0),
      valueColor: '#F2CA50',
      icon: <IconMoney />,
      iconBg: 'rgba(242, 202, 80, 0.1)',
      gradient: 'linear-gradient(90deg, #F2CA50 0%, #D4AF37 100%)',
      onClick: onVentasClick,
    },
    {
      label: 'Pedidos pendientes',
      value: loading ? '—' : String(kpis?.pedidosPendientes ?? 0),
      valueColor: '#E5E2E1',
      icon: <IconPackage />,
      iconBg: '#353534',
      gradient: null,
      onClick: onPedidosClick,
    },
    {
      label: 'Stock crítico',
      value: loading ? '—' : String(kpis?.stockCritico ?? 0),
      valueColor: '#FFB4AB',
      icon: <IconWarning />,
      iconBg: 'rgba(255, 180, 171, 0.1)',
      gradient: null,
      onClick: onStockClick,
    },
    {
      label: 'Ventas del mes',
      value: loading ? '—' : fmt(kpis?.ventasMes ?? 0),
      valueColor: '#E5E2E1',
      icon: <IconUsers />,
      iconBg: '#353534',
      gradient: null,
      onClick: onVentasMesClick,
    },
  ];

  return (
    <div className="kpi-bento-grid">
      {cards.map(card => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
