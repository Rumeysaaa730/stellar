import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { User } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (name: string, walletAddress?: string) => Promise<void>;
  register: (name: string, walletAddress: string, role: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Her açılışta oturum sıfırlanır
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  const login = async (name: string, walletAddress?: string) => {
    const r = await api.post('/auth/login', { name, wallet_address: walletAddress });
    localStorage.setItem('token', r.data.token);
    setToken(r.data.token);
    const fresh = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${r.data.token}` },
    });
    setUser(fresh.data);
  };

  const register = async (name: string, walletAddress: string, role: string) => {
    const r = await api.post('/auth/register', { name, role, wallet_address: walletAddress });
    localStorage.setItem('token', r.data.token);
    setToken(r.data.token);
    const fresh = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${r.data.token}` },
    });
    setUser(fresh.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (u: Partial<User>) => setUser(prev => prev ? { ...prev, ...u } : null);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
