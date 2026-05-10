import { Outlet } from 'react-router-dom';
import AdminNavbar from '../components/organisms/AdminNavbar';
import AdminBottomNavBar from '../components/organisms/AdminBottomNavBar';
import './AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminNavbar />
      <main className="admin-layout__main">
        <Outlet />
      </main>
      <AdminBottomNavBar />
    </div>
  );
}
