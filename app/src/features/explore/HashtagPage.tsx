import React, { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ExplorePage.module.css';
import { api } from '../../api/client';
import { Post } from '../../models';
import { imageUrl } from '../../utils/imageUrl';
import { usePagination } from '../../hooks/usePagination';

export function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();

  const fetcher = useCallback(
    (cursor: string | null) =>
      api.getPaginated<Post>(`/explore/hashtag/${encodeURIComponent(tag || '')}${cursor ? `?cursor=${cursor}` : ''}`),
    [tag]
  );

  const { items: posts, loading, loadingMore, hasMore, loadMore, refresh } = usePagination({ fetcher });

  useEffect(() => { refresh(); }, [refresh]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!hasMore || loadingMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className={styles.page} onScroll={handleScroll}>
      <div className={styles.inner}>
        <div style={{ padding: '4px 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 24, lineHeight: 1, padding: '4px 8px 4px 0' }}
          >‹</button>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>#{tag}</span>
        </div>

        {loading && <div className={styles.loading}>Loading…</div>}

        {!loading && posts.length === 0 && (
          <div className={styles.emptyState}>No posts yet for #{tag}</div>
        )}

        <div className={styles.grid}>
          {posts.map(post => {
            const images = post.imageUrls && post.imageUrls.length > 0
              ? post.imageUrls
              : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
            const thumb = imageUrl(images[0]?.thumbnailUrl || images[0]?.url || images[0]?.imageUrl);
            return (
              <div
                key={post.id}
                className={styles.gridItem}
                onClick={() => navigate(`/post/${post.id}`)}
              >
                {thumb && <img src={thumb} alt="" loading="lazy" />}
                {images.length > 1 && (
                  <div className={styles.multipleIndicator}>
                    <svg viewBox="0 0 24 24" fill="white" width={18} height={18}>
                      <rect x="2" y="2" width="15" height="15" rx="2" fill="none" stroke="white" strokeWidth="2"/>
                      <rect x="7" y="7" width="15" height="15" rx="2" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loadingMore && <div className={styles.loading}>Loading…</div>}
      </div>
    </div>
  );
}
