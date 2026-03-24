import React, { createContext, useContext, useState, useCallback } from 'react';
import { ColumnConfig, ColumnType } from '../types/columns';

const STORAGE_KEY = 'infotograf_columns';
const MAX_COLUMNS = 3;

function generateId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function loadColumns(): ColumnConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [{ id: 'default', type: 'home' }];
}

function saveColumns(columns: ColumnConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
}

interface ColumnsContextValue {
  columns: ColumnConfig[];
  addColumn: (type: ColumnType, params?: Record<string, string>) => void;
  removeColumn: (id: string) => void;
}

const ColumnsContext = createContext<ColumnsContextValue | null>(null);

export function ColumnsProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState<ColumnConfig[]>(loadColumns);

  const addColumn = useCallback((type: ColumnType, params?: Record<string, string>) => {
    setColumns(prev => {
      if (prev.length >= MAX_COLUMNS) return prev;
      const next = [...prev, { id: generateId(), type, params }];
      saveColumns(next);
      return next;
    });
  }, []);

  const removeColumn = useCallback((id: string) => {
    setColumns(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(c => c.id !== id);
      saveColumns(next);
      return next;
    });
  }, []);

  return (
    <ColumnsContext.Provider value={{ columns, addColumn, removeColumn }}>
      {children}
    </ColumnsContext.Provider>
  );
}

export function useColumns() {
  const ctx = useContext(ColumnsContext);
  if (!ctx) throw new Error('useColumns must be used within ColumnsProvider');
  return ctx;
}
