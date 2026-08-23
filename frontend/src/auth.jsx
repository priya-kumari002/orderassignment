import { createContext, useContext, useEffect, useState } from 'react';
import api from './services/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('om_user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const t = localStorage.getItem('om_token');
    if (!t) return;

    api
      .me()
      .then((u) => {
        setUser(u);
        localStorage.setItem('om_user', JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem('om_token');
        localStorage.removeItem('om_user');
        setUser(null);
      });
  }, []);

  function setSession(data) {
    if (!data?.token || !data?.user) return;
    localStorage.setItem('om_token', data.token);
    localStorage.setItem('om_user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('om_token');
    localStorage.removeItem('om_user');
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, setSession, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}