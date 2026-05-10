import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { fetchAdminConfig } from '../../../services/adminConfig';
import { fetchDashboardKpis, fetchRecentOrders, fetchLowStockItems } from '../../services/dashboard';
import KpiBentoGrid from '../../components/organisms/KpiBentoGrid/KpiBentoGrid';
import QuickActionsSection from '../../components/organisms/QuickActionsSection/QuickActionsSection';
import RecentOrdersSection from '../../components/organisms/RecentOrdersSection/RecentOrdersSection';
import LowStockModal from '../../components/organisms/LowStockModal/LowStockModal';
import './Dashboard.css';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name ?? '';

  const [storeName, setStoreName]       = useState('');
  const [kpis, setKpis]                 = useState(null);
  const [kpisLoading, setKpisLoading]   = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);

  const refreshKpis = useCallback(() => {
    fetchDashboardKpis().then(setKpis).catch(console.error);
  }, []);

  const refreshOrders = useCallback(() => {
    fetchRecentOrders().then(setRecentOrders).catch(console.error);
  }, []);

  // Initial load
  useEffect(() => {
    fetchAdminConfig()
      .then(config => setStoreName(config.store_name ?? ''))
      .catch(console.error);

    fetchDashboardKpis()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setKpisLoading(false));

    fetchRecentOrders()
      .then(setRecentOrders)
      .catch(console.error)
      .finally(() => setOrdersLoading(false));
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        refreshKpis();
        refreshOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'decants' }, refreshKpis)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [refreshKpis, refreshOrders]);

  const handleStockClick = useCallback(async () => {
    try {
      const items = await fetchLowStockItems();
      setLowStockItems(items);
      setShowStockModal(true);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="admin-dashboard">
      <section className="admin-dashboard__welcome">
        <p className="admin-dashboard__welcome-label">{storeName} Dashboard</p>
        <h1 className="admin-dashboard__welcome-title">
          {getGreeting()}, {firstName}
        </h1>
      </section>

      <KpiBentoGrid
        kpis={kpis}
        loading={kpisLoading}
        onVentasClick={() => navigate('/admin/reports')}
        onPedidosClick={() => navigate('/admin/orders')}
        onStockClick={handleStockClick}
        onVentasMesClick={() => navigate('/admin/reports')}
      />

      <QuickActionsSection />
      <RecentOrdersSection orders={recentOrders} loading={ordersLoading} />

      {showStockModal && (
        <LowStockModal
          items={lowStockItems}
          onClose={() => setShowStockModal(false)}
        />
      )}
    </div>
  );
}
