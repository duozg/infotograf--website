import React from 'react';
import styles from './ColumnsLayout.module.css';
import { useColumns } from '../../context/ColumnsContext';
import { ColumnShell } from './ColumnShell';

interface ColumnsLayoutProps {
  onPostClick?: (postId: string) => void;
}

export function ColumnsLayout({ onPostClick }: ColumnsLayoutProps) {
  const { columns, addColumn, removeColumn } = useColumns();

  return (
    <div className={styles.container}>
      {columns.map(col => (
        <div key={col.id} className={styles.column}>
          <ColumnShell
            config={col}
            canClose={columns.length > 1}
            canAdd={columns.length < 3}
            onClose={() => removeColumn(col.id)}
            onAdd={addColumn}
            onPostClick={onPostClick}
          />
        </div>
      ))}
    </div>
  );
}
