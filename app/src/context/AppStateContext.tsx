import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';

interface AppState {
  unreadNotifications: number;
  unreadMessages: number;
}

interface AppStateContextValue {
  unreadNotifications: number;
  unreadMessages: number;
  clearNotifications: () => void;
  clearMessages: () => void;
  refresh: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>({
    unreadNotifications: 0,
    unreadMessages: 0,
  });

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ notifications: number; messages: number }>('/users/me/unread');
      setState({
        unreadNotifications: res.notifications || 0,
        unreadMessages: res.messages || 0,
      });
    } catch {
      // Ignore polling errors
    }
  }, [user]);

  usePolling(fetchCounts, 3000, !!user);

  const clearNotifications = useCallback(() => {
    setState(s => ({ ...s, unreadNotifications: 0 }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(s => ({ ...s, unreadMessages: 0 }));
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        unreadNotifications: state.unreadNotifications,
        unreadMessages: state.unreadMessages,
        clearNotifications,
        clearMessages,
        refresh: fetchCounts,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
