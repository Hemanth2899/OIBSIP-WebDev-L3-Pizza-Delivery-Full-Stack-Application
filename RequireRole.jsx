import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="center-note">Loading...</p>;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} state={{ from: location }} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return children;
}
