import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Layout from '../components/layout/Layout';
import Home from '../pages/Home';
import Catalog from '../pages/Catalog';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Search from '../pages/Search';
import Wishlist from '../pages/Wishlist';
import Auth from '../pages/Auth';
import ResetPassword from '../pages/ResetPassword';
import Account from '../pages/Account';
import Checkout from '../pages/Checkout';
import PaymentResult from '../pages/PaymentResult';
import Orders from '../pages/Orders';
import Addresses from '../pages/Addresses';
import AdminGuard from '../admin/guards/AdminGuard';

// Admin — lazy loaded, bundle separado del cliente
const AdminLayout   = lazy(() => import('../admin/layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../admin/pages/Dashboard'));
const AdminOrders   = lazy(() => import('../admin/pages/Orders'));
const AdminProducts = lazy(() => import('../admin/pages/Products'));
const AdminUsers    = lazy(() => import('../admin/pages/Users'));
const AdminBanners  = lazy(() => import('../admin/pages/Banners'));
const AdminSettings     = lazy(() => import('../admin/pages/Settings'));
const AdminReports      = lazy(() => import('../admin/pages/Reports'));
const AdminProductEdit  = lazy(() => import('../admin/pages/ProductEdit'));
const AdminOrderDetail  = lazy(() => import('../admin/pages/OrderDetail'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Router() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Auth y páginas sin navbar */}
        <Route path="/login" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/payment/result" element={<PaymentResult />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/search" element={<Search />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/addresses" element={<Addresses />} />
        </Route>

        {/* Admin — guard de rol + lazy bundle */}
        <Route path="/admin" element={
          <AdminGuard>
            <Suspense fallback={null}>
              <AdminLayout />
            </Suspense>
          </AdminGuard>
        }>
          <Route index          element={<Suspense fallback={null}><AdminDashboard /></Suspense>} />
          <Route path="orders"  element={<Suspense fallback={null}><AdminOrders /></Suspense>} />
          <Route path="orders/:orderId" element={<Suspense fallback={null}><AdminOrderDetail /></Suspense>} />
          <Route path="products" element={<Suspense fallback={null}><AdminProducts /></Suspense>} />
          <Route path="products/:fragranceId" element={<Suspense fallback={null}><AdminProductEdit /></Suspense>} />
          <Route path="users"   element={<Suspense fallback={null}><AdminUsers /></Suspense>} />
          <Route path="banners" element={<Suspense fallback={null}><AdminBanners /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={null}><AdminSettings /></Suspense>} />
          <Route path="reports"  element={<Suspense fallback={null}><AdminReports /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
