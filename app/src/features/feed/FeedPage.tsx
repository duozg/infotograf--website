import React, { useEffect, useCallback } from 'react';
import styles from './FeedPage.module.css';
import { HeaderBar } from '../../components/HeaderBar';
import { PostCard } from '../../components/PostCard';
import { PostCardSkeleton } from '../../components/Skeleton';
import { api } from '../../api/client';
import { Post, PaginatedResponse } from '../../models';
import { usePagination } from '../../hooks/usePagination';

interface FeedPageProps {
  onCreatePost?: () => void;
  onOpenInbox?: () => void;
}

export function FeedPage({ onCreatePost, onOpenInbox }: FeedPageProps) {
  const fetcher = useCallback(
    (cursor: string | null) =>
      api.get<PaginatedResponse<Post>>(`/feed${cursor ? `?cursor=${cursor}` : ''}`),
    []
  );

  const { items: posts, loading, loadingMore, error, hasMore, loadMore, refresh, setItems } = usePagination({ fetcher });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpdate = useCallback((updated: Post) => {
    setItems(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, [setItems]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loadingMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  const msgBtn = (
    <button
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px' }}
      onClick={onOpenInbox}
      aria-label="Messages"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 22, height: 22 }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );

  return (
    <div className={styles.page} onScroll={handleScroll} style={{ overflowY: 'auto', height: '100%' }}>
      <HeaderBar showLogo rightActions={msgBtn} />

      <div className={styles.feed}>
        {loading && (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            {error}
            <br />
            <button className={styles.retryBtn} onClick={refresh}>Retry</button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📷</div>
            <div className={styles.emptyTitle}>Your feed is empty</div>
            <div className={styles.emptyText}>
              Follow people to see their photos here.
            </div>
          </div>
        )}

        {posts.map(post => (
          <PostCard key={post.id} post={post} onUpdate={handleUpdate} />
        ))}

        {loadingMore && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            Loading…
          </div>
        )}

        {!loadingMore && hasMore && (
          <button className={styles.loadMoreBtn} onClick={loadMore}>
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
