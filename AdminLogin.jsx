import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { errMsg } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn('/admin/login', form);
      nav('/admin', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap dark">
      <div className="auth-card">
        <p className="brand big">Oasis Kitchen</p>
        <h1>Staff sign in</h1>
        <form onSubmit={submit}>
          <label className="field"><span>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="username" />
          </label>
          <label className="field"><span>Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
          </label>
          {error && <p className="note err">{error}</p>}
          <button className="btn primary block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
