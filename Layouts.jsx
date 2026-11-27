import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export function UserLayout() {
  const { user, signOut } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  return (
    <>
      <header className="bar">
        <NavLink to="/" className="brand">Oasis Pizza</NavLink>
        <nav>
          <NavLink to="/" end>Menu</NavLink>
          <NavLink to="/build">Build your own</NavLink>
          <NavLink to="/checkout">Cart{count > 0 && <span className="pill">{count}</span>}</NavLink>
        </nav>
        <div className="who">
          <span>{user.name}</span>
          <button className="btn ghost" onClick={() => { signOut(); nav('/login'); }}>Sign out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <header className="bar admin">
        <span className="brand">Oasis Kitchen</span>
        <nav>
          <NavLink to="/admin" end>Inventory</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
        </nav>
        <div className="who">
          <span>{user.email}</span>
          <button className="btn ghost" onClick={() => { signOut(); nav('/admin/login'); }}>Sign out</button>
        </div>
      </header>
      <main className="page wide"><Outlet /></main>
    </>
  );
}
