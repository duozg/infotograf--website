import React, { useEffect, useCallback, useState, RefObject } from 'react';
import feedStyles from '../../features/feed/FeedPage.module.css';
import { PostCard } from '../PostCard';
import { PostCardSkeleton } from '../Skeleton';
import { api } from '../../api/client';
import { Post } from '../../models';
import { usePagination } from '../../hooks/usePagination';
import { useContainerScroll } from '../../hooks/useContainerScroll';

interface FeedColumnProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onPostClick?: (postId: string) => void;
}

const LAST_SEEN_KEY = 'infotograf_last_seen_post';

export function FeedColumn({ scrollContainerRef, onPostClick }: FeedColumnProps) {
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

  useContainerScroll(scrollContainerRef, { hasMore, loadMore });

  useEffect(() => {
    if (!lastSeenId || posts.length === 0 || markerDismissed.current) return;
    const idx = posts.findIndex(p => p.id === lastSeenId);
    if (idx > 0) setNewPostCount(idx);
  }, [posts, lastSeenId]);

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
    <div className={feedStyles.page}>
      {newPostCount > 0 && !markerDismissed.current && (
        <div className={feedStyles.newPostsPill}>
          <button className={feedStyles.pill} onClick={() => {
            markerDismissed.current = true;
            setNewPostCount(0);
            scrollContainerRef.current?.scrollTo(0, 0);
          }}>
            ↑ {newPostCount} new {newPostCount === 1 ? 'post' : 'posts'}
          </button>
        </div>
      )}

      {loading && (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      )}

      {!loading && error && (
        <div className={feedStyles.errorState}>
          {error}
          <br />
          <button className={feedStyles.retryBtn} onClick={refresh}>Retry</button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className={feedStyles.emptyState}>
          <div className={feedStyles.emptyIcon}>📷</div>
          <div className={feedStyles.emptyTitle}>Your feed is empty</div>
          <div className={feedStyles.emptyText}>Follow people to see their photos here.</div>
        </div>
      )}

      {posts.map(post => (
        <React.Fragment key={post.id}>
          {!markerDismissed.current && lastSeenId === post.id && newPostCount > 0 && (
            <div className={feedStyles.whereYouLeftOff} onClick={() => { markerDismissed.current = true; setNewPostCount(0); }}>
              <div className={feedStyles.whereYouLeftOffLine} />
              <span className={feedStyles.whereYouLeftOffText}>Where you left off</span>
              <div className={feedStyles.whereYouLeftOffLine} />
            </div>
          )}
          <PostCard
            post={post}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onPostClick={onPostClick ? (p) => onPostClick(p.remotePostId || p.id) : undefined}
          />
        </React.Fragment>
      ))}

      {loadingMore && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {!loadingMore && hasMore && (
        <button className={feedStyles.loadMoreBtn} onClick={loadMore}>Load more</button>
      )}

      {!loading && !loadingMore && !hasMore && posts.length > 0 && (
        <div className={feedStyles.allCaughtUp}>
          <div className={feedStyles.allCaughtUpTitle}>✓ You're all caught up</div>
          <div className={feedStyles.allCaughtUpSubtitle}>You've seen all new posts from the last 48 hours</div>
        </div>
      )}
    </div>
  );
}
