import React from 'react';
import styles from './ColumnsLayout.module.css';
import { useColumns } from '../../context/ColumnsContext';
import { ColumnShell } from './ColumnShell';
import { AddColumnMenu } from './AddColumnMenu';

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
            onClose={() => removeColumn(col.id)}
            onPostClick={onPostClick}
          />
        </div>
      ))}
      {columns.length < 3 && (
        <AddColumnMenu onAdd={addColumn} />
      )}
    </div>
  );
}
