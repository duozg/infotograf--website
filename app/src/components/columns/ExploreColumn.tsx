import React, { useEffect, useCallback, useRef, RefObject } from 'react';
import exploreStyles from '../../features/explore/ExplorePage.module.css';
import { api } from '../../api/client';
import { Post } from '../../models';
import { imageUrl } from '../../utils/imageUrl';
import { toCount } from '../../utils/textParser';
import { usePagination } from '../../hooks/usePagination';
import { useContainerScroll } from '../../hooks/useContainerScroll';

interface ExploreColumnProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onPostClick?: (postId: string) => void;
}

export function ExploreColumn({ scrollContainerRef, onPostClick }: ExploreColumnProps) {
  const fetcher = useCallback(
    (cursor: string | null) =>
      api.getPaginated<Post>(`/explore${cursor ? `?cursor=${cursor}` : ''}`),
    []
  );

  const { items: posts, loading, hasMore, loadMore, refresh } = usePagination({ fetcher });

  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    refresh();
  }, [refresh]);

  useContainerScroll(scrollContainerRef, { hasMore, loadMore });

  return (
    <div style={{ padding: 12 }}>
      {loading && <div className={exploreStyles.loading}>Loading…</div>}

      {!loading && posts.length === 0 && (
        <div className={exploreStyles.emptyState}>No posts to explore</div>
      )}

      <div className={exploreStyles.grid}>
        {posts.map(post => {
          const images = post.imageUrls && post.imageUrls.length > 0
            ? post.imageUrls
            : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
          const thumb = imageUrl(images[0]?.thumbnailUrl || images[0]?.url || images[0]?.imageUrl);
          return (
            <div
              key={post.id}
              className={exploreStyles.gridItem}
              onClick={() => onPostClick?.(post.id)}
            >
              {thumb && <img src={thumb} alt="" loading="lazy" />}
              <div className={exploreStyles.gridOverlay}>
                <span className={exploreStyles.gridStat}>
                  <svg viewBox="0 0 24 24" fill="white" width={14} height={14}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {toCount(post.likeCount).toLocaleString()}
                </span>
                <span className={exploreStyles.gridStat}>
                  <svg viewBox="0 0 24 24" fill="white" width={14} height={14}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {toCount(post.commentCount).toLocaleString()}
                </span>
              </div>
              {images.length > 1 && (
                <div className={exploreStyles.multipleIndicator}>
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
    </div>
  );
}
