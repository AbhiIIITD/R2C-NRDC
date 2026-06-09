import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types/index';
import { api, setAccessToken } from '@/services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole, organization?: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: true, error: null });

  useEffect(() => {
    api.get<User>('/auth/me')
      .then((user) => setAuthState({ user, isAuthenticated: true, isLoading: false, error: null }))
      .catch(() => {
        setAccessToken(null);
        localStorage.removeItem('auth_user');
        setAuthState({ user: null, isAuthenticated: false, isLoading: false, error: null });
      });
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password });
      setAccessToken(result.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      setAuthState({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setAuthState({ user: null, isAuthenticated: false, isLoading: false, error: message });
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole, organization?: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await api.post<{ accessToken: string; user: User }>('/auth/signup', { email, password, name, role, organization });
      setAccessToken(result.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      setAuthState({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      setAuthState({ user: null, isAuthenticated: false, isLoading: false, error: message });
      throw error;
    }
  };

  const logout = () => {
    void api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    localStorage.removeItem('auth_user');
    setAuthState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  };

  const forgotPassword = async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  };

  return <AuthContext.Provider value={{ ...authState, login, signup, logout, forgotPassword }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

