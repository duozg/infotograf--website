import React, { useEffect, useCallback, useRef, RefObject } from 'react';
import exploreStyles from '../../features/explore/ExplorePage.module.css';
import { api } from '../../api/client';
import { Post } from '../../models';
import { imageUrl } from '../../utils/imageUrl';
import { usePagination } from '../../hooks/usePagination';
import { useContainerScroll } from '../../hooks/useContainerScroll';

interface HashtagColumnProps {
  tag: string;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onPostClick?: (postId: string) => void;
}

export function HashtagColumn({ tag, scrollContainerRef, onPostClick }: HashtagColumnProps) {
  const fetcher = useCallback(
    (cursor: string | null) =>
      api.getPaginated<Post>(`/explore/hashtag/${encodeURIComponent(tag)}${cursor ? `?cursor=${cursor}` : ''}`),
    [tag]
  );

  const { items: posts, loading, loadingMore, hasMore, loadMore, refresh } = usePagination({ fetcher });

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
        <div className={exploreStyles.emptyState}>No posts yet for #{tag}</div>
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

      {loadingMore && <div className={exploreStyles.loading}>Loading…</div>}
    </div>
  );
}
