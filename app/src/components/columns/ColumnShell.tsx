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

const COLUMN_OPTIONS: { type: ColumnType; icon: string }[] = [
  { type: 'home', icon: '🏠' },
  { type: 'explore', icon: '🔍' },
  { type: 'hashtag', icon: '#' },
  { type: 'fediverse', icon: '🌐' },
  { type: 'rss', icon: '📡' },
];

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
                  {COLUMN_OPTIONS.map(opt => (
                    <button
                      key={opt.type}
                      className={styles.dropdownItem}
                      onClick={() => handleAddColumn(opt.type)}
                    >
                      <span className={styles.dropdownIcon}>{opt.icon}</span>
                      {COLUMN_LABELS[opt.type]}
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
