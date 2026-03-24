import React, { useState } from 'react';
import styles from './AddColumnMenu.module.css';
import { ColumnType } from '../../types/columns';

interface AddColumnMenuProps {
  onAdd: (type: ColumnType, params?: Record<string, string>) => void;
}

export function AddColumnMenu({ onAdd }: AddColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [hashtagValue, setHashtagValue] = useState('');

  const handleAdd = (type: ColumnType) => {
    onAdd(type);
    setOpen(false);
    setShowHashtagInput(false);
  };

  const handleAddHashtag = () => {
    const tag = hashtagValue.trim().replace(/^#/, '');
    if (!tag) return;
    onAdd('hashtag', { tag });
    setHashtagValue('');
    setShowHashtagInput(false);
    setOpen(false);
  };

  return (
    <div className={styles.addBtn} onClick={() => { if (!open) setOpen(true); }}>
      +
      {open && (
        <>
          <div className={styles.backdrop} onClick={(e) => { e.stopPropagation(); setOpen(false); setShowHashtagInput(false); }} />
          <div className={styles.menu} onClick={e => e.stopPropagation()}>
            <button className={styles.menuItem} onClick={() => handleAdd('home')}>
              <span className={styles.menuIcon}>🏠</span> Home Feed
            </button>
            <button className={styles.menuItem} onClick={() => handleAdd('explore')}>
              <span className={styles.menuIcon}>🔍</span> Explore
            </button>
            <button className={styles.menuItem} onClick={() => setShowHashtagInput(true)}>
              <span className={styles.menuIcon}>#</span> Hashtag
            </button>
            <button className={styles.menuItem} onClick={() => handleAdd('fediverse')}>
              <span className={styles.menuIcon}>🌐</span> Fediverse
            </button>
            {showHashtagInput && (
              <div className={styles.hashtagInput}>
                <input
                  type="text"
                  placeholder="Enter hashtag…"
                  value={hashtagValue}
                  onChange={e => setHashtagValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddHashtag(); }}
                  autoFocus
                />
                <button className="btn-cta" onClick={handleAddHashtag}>Add</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
