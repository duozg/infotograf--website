import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../models';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  initialized: boolean;
}

type AuthAction =
  | { type: 'INIT'; payload: { user: User; accessToken: string; refreshToken: string } | null }
  | { type: 'LOGIN'; payload: AuthResponse }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT':
      if (!action.payload) return { ...state, initialized: true };
      return {
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        initialized: true,
      };
    case 'LOGIN':
      return {
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        initialized: true,
      };
    case 'LOGOUT':
      return { user: null, accessToken: null, refreshToken: null, initialized: true };
    case 'UPDATE_USER':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

interface AuthContextValue {
  user: User | null;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; phone: string; phoneToken: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    accessToken: null,
    refreshToken: null,
    initialized: false,
  });

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');

    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        dispatch({ type: 'INIT', payload: { user, accessToken, refreshToken: refreshToken || '' } });
        // Refresh user data in background
        api.get<User>(`/users/${user.username}`).then(freshUser => {
          localStorage.setItem('user', JSON.stringify(freshUser));
          dispatch({ type: 'UPDATE_USER', payload: freshUser });
        }).catch(() => {
          // Ignore — tokens might still be valid for other calls
        });
      } catch {
        dispatch({ type: 'INIT', payload: null });
      }
    } else {
      dispatch({ type: 'INIT', payload: null });
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { login: username, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    dispatch({ type: 'LOGIN', payload: data });
  }, []);

  const register = useCallback(async (fields: { username: string; email: string; password: string; phone: string; phoneToken: string }) => {
    const data = await api.post<AuthResponse>('/auth/register', {
      ...fields,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
      language: navigator.languages?.[0] || navigator.language,
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    dispatch({ type: 'LOGIN', payload: data });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
    // Update stored user
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        localStorage.setItem('user', JSON.stringify({ ...user, ...data }));
      } catch {}
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user: state.user, initialized: state.initialized, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
