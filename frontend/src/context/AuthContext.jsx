import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('chaispot_user');
    return raw ? JSON.parse(raw) : null;
  });

  const persist = (token, userData) => {
    localStorage.setItem('chaispot_token', token);
    localStorage.setItem('chaispot_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const { data } = await api.post('/auth/signup', { email, password, name });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chaispot_token');
    localStorage.removeItem('chaispot_user');
    setUser(null);
  }, []);

  const updatePoints = useCallback((points) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, points };
      localStorage.setItem('chaispot_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updatePoints }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
