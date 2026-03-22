import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';

interface AppState {
  unreadNotifications: number;
  unreadMessages: number;
  federationEnabled: boolean;
}

interface AppStateContextValue {
  unreadNotifications: number;
  unreadMessages: number;
  federationEnabled: boolean;
  setFederationEnabled: (v: boolean) => void;
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
    federationEnabled: false,
  });

  // Fetch federation status once on login
  useEffect(() => {
    if (!user) return;
    api.get<{ federationEnabled: boolean }>('/federation/status')
      .then(res => setState(s => ({ ...s, federationEnabled: res.federationEnabled })))
      .catch(() => {});
  }, [user]);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [notifRes, msgRes] = await Promise.allSettled([
        api.get<{ count: number }>('/notifications/unread-count'),
        api.get<{ count: number }>('/conversations/unread-count'),
      ]);
      setState(s => ({
        ...s,
        unreadNotifications: notifRes.status === 'fulfilled'
          ? (typeof notifRes.value.count === 'string' ? parseInt(notifRes.value.count, 10) : notifRes.value.count) || 0
          : 0,
        unreadMessages: msgRes.status === 'fulfilled'
          ? (typeof msgRes.value.count === 'string' ? parseInt(msgRes.value.count, 10) : msgRes.value.count) || 0
          : 0,
      }));
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

  const setFederationEnabled = useCallback((v: boolean) => {
    setState(s => ({ ...s, federationEnabled: v }));
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        unreadNotifications: state.unreadNotifications,
        unreadMessages: state.unreadMessages,
        federationEnabled: state.federationEnabled,
        setFederationEnabled,
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
