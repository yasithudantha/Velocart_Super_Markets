import type { ReactNode } from "react";
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './features/landing/components/LandingPage';
import Register from './features/auth/components/Register';
import Login from './features/auth/components/Login';
import VerifyEmail from './features/auth/components/VerifyEmail';
import ForgotPassword from './features/auth/components/ForgotPassword';
import ResetPassword from './features/auth/components/ResetPassword';
import Profile from './features/auth/components/Profile';
import Terms from './features/legal/components/Terms';
import Privacy from './features/legal/components/Privacy';
import ProductCatalog from './features/catalog/components/ProductCatalog';
import ProductDetails from './features/catalog/components/ProductDetails';
import OrderHistory from './features/orders/components/OrderHistory';
import AdminProductCreator from './features/admin/components/AdminProductCreator'; 
import AdminCatalog from './features/admin/components/AdminCatalog';
import PurchaseOrderManager from './features/admin/components/PurchaseOrderManager';
import RealTimeInventoryDashboard from './features/admin/components/RealTimeInventoryDashboard';
import DeliveryManagerDashboard from './features/admin/components/DeliveryManagerDashboard';
import PromotionManagerDashboard from './features/admin/components/PromotionManagerDashboard'; 
import VerifyEmailChange from './features/auth/components/VerifyEmailChange';// Ensure this is imported!
import MainAdminDashboard from './features/admin/components/MainAdminDashboard';

// ==========================================
// FEATURE 5: IDLE TIMEOUT ENGINE
// ==========================================
function SessionGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleActivity = () => {
      clearTimeout(timeoutId);
      // 30 Minute Idle Timeout
      timeoutId = setTimeout(() => {
        if (localStorage.getItem('token')) {
          localStorage.clear();
          navigate('/login?session=idle', { replace: true });
        }
      }, 30 * 60 * 1000); 
    };

    // Listeners for activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));
    handleActivity(); // Initialize

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearTimeout(timeoutId);
    };
  }, [navigate, location.pathname]);

  return children;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles: string[] }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const location = useLocation();

  if (!token || !userStr) return <Navigate to="/login" state={{ from: location }} replace />;

  const user = JSON.parse(userStr);
  const userRole = String(user.role || user.Role || '').toUpperCase();
  
  if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/catalog" replace />;
  }
  return children;
}

function LoginWrapper() {
  const navigate = useNavigate();
  return <Login onSwitchToRegister={() => navigate('/register')} />;
}

function RegisterWrapper() {
  return <Register />;
}

function App() {
  return (
    <Router>
      <SessionGuard>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/register" element={<RegisterWrapper />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/verify-email-change" element={<VerifyEmailChange />} />

          {/* CUSTOMER ROUTES */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/catalog" element={<PrivateRoute><ProductCatalog /></PrivateRoute>} />
          <Route path="/product/:id" element={<PrivateRoute><ProductDetails /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />

          {/* SECURE ADMIN ROUTES */}
          <Route path="/admin/catalog" element={<AdminRoute allowedRoles={['ADMIN', 'PRODUCTMANAGER']}><AdminCatalog /></AdminRoute>} />
          <Route path="/admin/products/new" element={<AdminRoute allowedRoles={['ADMIN', 'PRODUCTMANAGER']}><AdminProductCreator /></AdminRoute>} />
          
          <Route path="/admin/purchase-orders" element={
            <AdminRoute allowedRoles={['ADMIN', 'PRODUCTMANAGER']}>
                <PurchaseOrderManager />
            </AdminRoute>
          } />

          <Route path="/admin/delivery-management" element={
            <AdminRoute allowedRoles={['ADMIN', 'DELIVERYMANAGER']}>
                <DeliveryManagerDashboard />
            </AdminRoute>
          } />

          <Route path="/admin/inventory" element={
            <AdminRoute allowedRoles={['ADMIN', 'PRODUCTMANAGER']}>
                <RealTimeInventoryDashboard />
            </AdminRoute>
          } />

          {/* THE NEW PROMOTION MANAGER ROUTE */}
          <Route path="/admin/promotions" element={
            <AdminRoute allowedRoles={['ADMIN', 'PROMOTIONMANAGER']}>
                <PromotionManagerDashboard />
            </AdminRoute>
          } />

        <Route path="/admin/main-admin" element={
          <AdminRoute allowedRoles={['MAINADMIN']}>
                <MainAdminDashboard />
            </AdminRoute>
          } />
        
        </Routes>
      </SessionGuard>
    </Router>
  );
}

export default App;