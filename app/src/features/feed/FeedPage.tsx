import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FeedPage.module.css';
import { PostCard } from '../../components/PostCard';
import { PostCardSkeleton } from '../../components/Skeleton';
import { api } from '../../api/client';
import { Post } from '../../models';
import { usePagination } from '../../hooks/usePagination';

interface FeedPageProps {
  onCreatePost?: () => void;
}

const LAST_SEEN_KEY = 'infotograf_last_seen_post';

export function FeedPage({ onCreatePost }: FeedPageProps) {
  const navigate = useNavigate();
  const fetcher = useCallback(
    (cursor: string | null) =>
      api.getPaginated<Post>(`/feed${cursor ? `?cursor=${cursor}` : ''}`),
    []
  );

  const { items: posts, loading, loadingMore, error, hasMore, loadMore, refresh, setItems } = usePagination({ fetcher });
  const [lastSeenId] = useState<string | null>(() => localStorage.getItem(LAST_SEEN_KEY));
  const [newPostCount, setNewPostCount] = useState(0);
  const markerDismissed = React.useRef(false);

  useEffect(() => { refresh(); }, [refresh]);

  // Calculate new posts above the "where you left off" marker
  useEffect(() => {
    if (!lastSeenId || posts.length === 0 || markerDismissed.current) return;
    const idx = posts.findIndex(p => p.id === lastSeenId);
    if (idx > 0) setNewPostCount(idx);
  }, [posts, lastSeenId]);

  // Save the top post ID when leaving the page
  useEffect(() => {
    return () => {
      if (posts.length > 0) {
        localStorage.setItem(LAST_SEEN_KEY, posts[0].id);
      }
    };
  }, [posts]);

  const handleUpdate = useCallback((updated: Post) => {
    setItems(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, [setItems]);

  const handleDelete = useCallback((postId: string) => {
    setItems(prev => prev.filter(p => p.id !== postId));
  }, [setItems]);

  return (
    <div className={styles.page}>
      {/* New posts pill */}
      {newPostCount > 0 && !markerDismissed.current && (
        <div className={styles.newPostsPill}>
          <button className={styles.pill} onClick={() => { markerDismissed.current = true; setNewPostCount(0); window.scrollTo(0, 0); }}>
            ↑ {newPostCount} new {newPostCount === 1 ? 'post' : 'posts'}
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className={styles.errorState}>
          {error}
          <br />
          <button className={styles.retryBtn} onClick={refresh}>Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📷</div>
          <div className={styles.emptyTitle}>Your feed is empty</div>
          <div className={styles.emptyText}>Follow people to see their photos here.</div>
        </div>
      )}

      {/* Posts */}
      {posts.map(post => (
        <React.Fragment key={post.id}>
          {!markerDismissed.current && lastSeenId === post.id && newPostCount > 0 && (
            <div className={styles.whereYouLeftOff} onClick={() => { markerDismissed.current = true; setNewPostCount(0); }}>
              <div className={styles.whereYouLeftOffLine} />
              <span className={styles.whereYouLeftOffText}>Where you left off</span>
              <div className={styles.whereYouLeftOffLine} />
            </div>
          )}
          <PostCard post={post} onUpdate={handleUpdate} onDelete={handleDelete} />
        </React.Fragment>
      ))}

      {/* Loading more */}
      {loadingMore && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {/* Load more button */}
      {!loadingMore && hasMore && (
        <button className={styles.loadMoreBtn} onClick={loadMore}>Load more</button>
      )}

      {/* All caught up */}
      {!loading && !loadingMore && !hasMore && posts.length > 0 && (
        <div className={styles.allCaughtUp}>
          <div className={styles.allCaughtUpTitle}>✓ You're all caught up</div>
          <div className={styles.allCaughtUpSubtitle}>You've seen all new posts from the last 48 hours</div>
          <button className={styles.allCaughtUpBtn} onClick={() => navigate('/explore')}>
            Explore more photos →
          </button>
        </div>
      )}
    </div>
  );
}
