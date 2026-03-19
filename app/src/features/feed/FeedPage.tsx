import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FeedPage.module.css';
import { PostCard } from '../../components/PostCard';
import { PostCardSkeleton } from '../../components/Skeleton';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { Post, User } from '../../models';
import { usePagination } from '../../hooks/usePagination';
import { useAuth } from '../../context/AuthContext';
import { toCount } from '../../utils/textParser';

interface FeedPageProps {
  onCreatePost?: () => void;
}

function Sidebar({ onCreatePost }: { onCreatePost?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<{ users: User[] } | User[]>('/users/suggestions')
      .then(res => {
        const list = Array.isArray(res) ? res : (res as { users: User[] }).users || [];
        setSuggestions(list.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const handleFollow = async (u: User) => {
    const isFollowing = followed[u.id] ?? u.isFollowing;
    setFollowed(prev => ({ ...prev, [u.id]: !isFollowing }));
    try {
      if (isFollowing) await api.delete(`/follows/${u.id}`);
      else await api.post(`/follows/${u.id}`);
    } catch {
      setFollowed(prev => ({ ...prev, [u.id]: isFollowing }));
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Current user card */}
      {user && (
        <div className={styles.userCard}>
          <div className={styles.userCardAvatar} onClick={() => navigate('/profile')}>
            <Avatar src={user.avatarUrl} username={user.username} size="lg" />
          </div>
          <div className={styles.userCardInfo}>
            <div className={styles.userCardUsername} onClick={() => navigate('/profile')}>
              {user.username}
            </div>
            {user.displayName && (
              <div className={styles.userCardName}>{user.displayName}</div>
            )}
          </div>
          <button className={styles.switchBtn} onClick={() => navigate('/profile')}>
            Profile
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <div className={styles.suggestionsHeader}>
            <span className={styles.suggestionsTitle}>Suggestions For You</span>
            <button className={styles.seeAllBtn} onClick={() => navigate('/explore')}>
              See All
            </button>
          </div>
          {suggestions.map(u => {
            const isFollowing = followed[u.id] ?? u.isFollowing;
            return (
              <div key={u.id} className={styles.suggestItem}>
                <div className={styles.suggestAvatarWrap} onClick={() => navigate(`/profile/${u.username}`)}>
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                </div>
                <div className={styles.suggestInfo} onClick={() => navigate(`/profile/${u.username}`)}>
                  <div className={styles.suggestUsername}>{u.username}</div>
                  {u.displayName && <div className={styles.suggestSub}>{u.displayName}</div>}
                </div>
                <button
                  className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
                  onClick={() => handleFollow(u)}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer links */}
      <div className={styles.sidebarFooter}>
        <a href="/about" className={styles.footerLink}>About</a>
        <a href="/privacy" className={styles.footerLink}>Privacy</a>
        <a href="/terms" className={styles.footerLink}>Terms</a>
        <a href="/support" className={styles.footerLink}>Help</a>
        <span className={styles.footerCopy}>© 2025 Infotograf</span>
      </div>
    </aside>
  );
}

export function FeedPage({ onCreatePost }: FeedPageProps) {
  const fetcher = useCallback(
    (cursor: string | null) =>
      api.getPaginated<Post>(`/feed${cursor ? `?cursor=${cursor}` : ''}`),
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
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className={styles.page} onScroll={handleScroll}>
      <div className={styles.layout}>
        {/* Feed column */}
        <div className={styles.feedColumn}>
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
              <div className={styles.emptyText}>Follow people to see their photos here.</div>
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

        {/* Sidebar */}
        <Sidebar onCreatePost={onCreatePost} />
      </div>
    </div>
  );
}
