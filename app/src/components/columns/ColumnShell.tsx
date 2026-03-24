import React, { useRef, useState } from 'react';
import styles from './ColumnShell.module.css';
import { ColumnConfig, ColumnType, COLUMN_LABELS } from '../../types/columns';
import { FeedColumn } from './FeedColumn';
import { ExploreColumn } from './ExploreColumn';
import { HashtagColumn } from './HashtagColumn';
import { FediverseColumn } from './FediverseColumn';
import { RssColumn } from './RssColumn';

interface ColumnShellProps {
  config: ColumnConfig;
  canClose: boolean;
  canAdd: boolean;
  onClose: () => void;
  onAdd: (type: ColumnType, params?: Record<string, string>) => void;
  onPostClick?: (postId: string) => void;
}

function ColumnIcon({ type }: { type: ColumnType }) {
  const s = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'home': return <svg {...s}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'explore': return <svg {...s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'hashtag': return <svg {...s}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
    case 'fediverse': return <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'rss': return <svg {...s}><circle cx="6.18" cy="17.82" r="2.18" fill="currentColor" stroke="none"/><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56z"/><path d="M4 10.1v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/></svg>;
  }
}

const COLUMN_OPTIONS: ColumnType[] = ['home', 'explore', 'hashtag', 'fediverse', 'rss'];

export function ColumnShell({ config, canClose, canAdd, onClose, onAdd, onPostClick }: ColumnShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hashtagValue, setHashtagValue] = useState('');
  const [showHashtagInput, setShowHashtagInput] = useState(false);

  const label = config.type === 'hashtag' && config.params?.tag
    ? `#${config.params.tag}`
    : COLUMN_LABELS[config.type];

  const handleAddColumn = (type: ColumnType) => {
    if (type === 'hashtag') {
      setShowHashtagInput(true);
      return;
    }
    onAdd(type);
    setMenuOpen(false);
  };

  const handleAddHashtag = () => {
    const tag = hashtagValue.trim().replace(/^#/, '');
    if (!tag) return;
    onAdd('hashtag', { tag });
    setHashtagValue('');
    setShowHashtagInput(false);
    setMenuOpen(false);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <button className={styles.titleBtn} onClick={() => setMenuOpen(!menuOpen)}>
          {label}
          <span className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ''}`}>▾</span>
        </button>
        {canClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Remove column">×</button>
        )}

        {menuOpen && (
          <>
            <div className={styles.backdrop} onClick={() => { setMenuOpen(false); setShowHashtagInput(false); }} />
            <div className={styles.dropdown}>
              {canAdd && (
                <div className={styles.dropdownSection}>
                  <div className={styles.dropdownLabel}>Add column</div>
                  {COLUMN_OPTIONS.map(type => (
                    <button
                      key={type}
                      className={styles.dropdownItem}
                      onClick={() => handleAddColumn(type)}
                    >
                      <span className={styles.dropdownIcon}><ColumnIcon type={type} /></span>
                      {COLUMN_LABELS[type]}
                    </button>
                  ))}
                  {showHashtagInput && (
                    <div className={styles.hashtagRow}>
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
              )}
            </div>
          </>
        )}
      </div>

      <div className={styles.scrollContainer} ref={scrollRef}>
        {config.type === 'home' && (
          <FeedColumn scrollContainerRef={scrollRef} onPostClick={onPostClick} />
        )}
        {config.type === 'explore' && (
          <ExploreColumn scrollContainerRef={scrollRef} onPostClick={onPostClick} />
        )}
        {config.type === 'hashtag' && config.params?.tag && (
          <HashtagColumn tag={config.params.tag} scrollContainerRef={scrollRef} onPostClick={onPostClick} />
        )}
        {config.type === 'fediverse' && (
          <FediverseColumn scrollContainerRef={scrollRef} />
        )}
        {config.type === 'rss' && (
          <RssColumn scrollContainerRef={scrollRef} />
        )}
      </div>
    </div>
  );
}
