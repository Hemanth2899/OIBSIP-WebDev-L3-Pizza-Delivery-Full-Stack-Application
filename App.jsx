import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './components/RequireRole.jsx';
import { AdminLayout, UserLayout } from './components/Layouts.jsx';
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Builder from './pages/Builder.jsx';
import Checkout from './pages/Checkout.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import Inventory from './pages/admin/Inventory.jsx';
import Orders from './pages/admin/Orders.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route element={<RequireRole role="user"><UserLayout /></RequireRole>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/build" element={<Builder />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
