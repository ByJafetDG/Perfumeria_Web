import { useNavigate } from 'react-router-dom';
import './QuickActionsSection.css';

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <line x1="7" y1="1" x2="7" y2="13" stroke="#3C2F00" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="7" x2="13" y2="7" stroke="#3C2F00" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPackage = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E5E2E1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconChart = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E5E2E1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default function QuickActionsSection() {
  const navigate = useNavigate();

  return (
    <section className="quick-actions">
      <h2 className="quick-actions__title">Acciones rápidas</h2>

      <div className="quick-actions__buttons">
        <button
          className="quick-actions__btn-primary"
          onClick={() => navigate('/admin/products/new')}
        >
          <IconPlus />
          <span className="quick-actions__btn-primary-text">Nueva fragancia</span>
        </button>

        <div className="quick-actions__row">
          <button
            className="quick-actions__btn-secondary"
            onClick={() => navigate('/admin/orders')}
          >
            <IconPackage />
            <span className="quick-actions__btn-secondary-text">Ver pedidos</span>
          </button>

          <button
            className="quick-actions__btn-secondary"
            onClick={() => navigate('/admin/reports')}
          >
            <IconChart />
            <span className="quick-actions__btn-secondary-text">Ver reportes</span>
          </button>
        </div>
      </div>
    </section>
  );
}
