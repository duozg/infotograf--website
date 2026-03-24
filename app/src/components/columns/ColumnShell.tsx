import React, { useRef } from 'react';
import styles from './ColumnShell.module.css';
import { ColumnConfig, COLUMN_LABELS } from '../../types/columns';
import { FeedColumn } from './FeedColumn';
import { ExploreColumn } from './ExploreColumn';
import { HashtagColumn } from './HashtagColumn';
import { FediverseColumn } from './FediverseColumn';

interface ColumnShellProps {
  config: ColumnConfig;
  canClose: boolean;
  onClose: () => void;
  onPostClick?: (postId: string) => void;
}

export function ColumnShell({ config, canClose, onClose, onPostClick }: ColumnShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const label = config.type === 'hashtag' && config.params?.tag
    ? `#${config.params.tag}`
    : COLUMN_LABELS[config.type];

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <span className={styles.title}>{label}</span>
        {canClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Remove column">
            ×
          </button>
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
      </div>
    </div>
  );
}
