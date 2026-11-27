import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('pizza_token'));

  useEffect(() => {
    if (!localStorage.getItem('pizza_token')) return;
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('pizza_token'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem('pizza_token');
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const signIn = async (path, body) => {
    const { data } = await api.post(path, body);
    localStorage.setItem('pizza_token', data.token);
    setUser(data.user);
    return data.user;
  };
  const signOut = () => {
    localStorage.removeItem('pizza_token');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthCtx.Provider>;
}
