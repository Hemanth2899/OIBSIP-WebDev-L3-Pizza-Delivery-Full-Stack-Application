import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

function Shell({ title, sub, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="brand big">Oasis Pizza</p>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
        {children}
        {footer && <p className="auth-foot">{footer}</p>}
      </div>
    </div>
  );
}

const Field = ({ label, ...props }) => (
  <label className="field">
    <span>{label}</span>
    <input {...props} />
  </label>
);

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const { data } = await api.post('/auth/register', form);
      setMsg({ type: 'ok', text: data.message });
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
    setBusy(false);
  };

  return (
    <Shell title="Create your account" footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
      <form onSubmit={submit}>
        <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <Field label="Password (8+ characters)" type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
        {msg.text && <p className={`note ${msg.type}`}>{msg.text}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
      </form>
    </Shell>
  );
}

export function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    setUnverified(false);
    try {
      await signIn('/auth/login', form);
      nav(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
      setUnverified(err.response?.data?.code === 'EMAIL_NOT_VERIFIED');
    }
    setBusy(false);
  };
  const resend = async () => {
    try {
      const { data } = await api.post('/auth/resend-verification', { email: form.email });
      setMsg({ type: 'ok', text: data.message });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
  };

  return (
    <Shell title="Sign in" footer={<>New here? <Link to="/register">Create an account</Link></>}>
      <form onSubmit={submit}>
        <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
        <Field label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
        {msg.text && <p className={`note ${msg.type}`}>{msg.text}</p>}
        {unverified && <button type="button" className="btn ghost block" onClick={resend}>Send a new verification email</button>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="auth-foot"><Link to="/forgot-password">Forgot your password?</Link></p>
    </Shell>
  );
}

export function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ status: 'loading', text: 'Verifying your email...' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api
      .post('/auth/verify-email', { token })
      .then((r) => setState({ status: 'ok', text: r.data.message }))
      .catch((e) => setState({ status: 'err', text: errMsg(e) }));
  }, [token]);

  return (
    <Shell title="Email verification">
      <p className={`note ${state.status === 'ok' ? 'ok' : state.status === 'err' ? 'err' : ''}`}>{state.text}</p>
      <Link className="btn primary block" to="/login">Go to sign in</Link>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMsg({ type: 'ok', text: data.message });
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
    }
    setBusy(false);
  };

  return (
    <Shell title="Reset your password" sub="Enter your email and we'll send you a reset link." footer={<Link to="/login">Back to sign in</Link>}>
      <form onSubmit={submit}>
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {msg.text && <p className={`note ${msg.type}`}>{msg.text}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
      </form>
    </Shell>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setMsg({ type: 'ok', text: data.message });
      setTimeout(() => nav('/login'), 1500);
    } catch (err) {
      setMsg({ type: 'err', text: errMsg(err) });
      setBusy(false);
    }
  };

  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit}>
        <Field label="New password (8+ characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        {msg.text && <p className={`note ${msg.type}`}>{msg.text}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
      </form>
    </Shell>
  );
}
