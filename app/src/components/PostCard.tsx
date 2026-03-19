import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PostCard.module.css';
import { Post } from '../models';
import { Avatar } from './Avatar';
import { ImageCarousel } from './ImageCarousel';
import { TextEntityRenderer } from './TextEntityRenderer';
import { timeAgo } from '../utils/timeAgo';
import { imageUrl } from '../utils/imageUrl';
import { toCount } from '../utils/textParser';
import { api } from '../api/client';

interface PostCardProps {
  post: Post;
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  onUpdate?: (updated: Post) => void;
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function PostCard({ post, onPostClick, onUserClick, onUpdate }: PostCardProps) {
  const navigate = useNavigate();
  const [localPost, setLocalPost] = useState(post);

  // Sync with parent
  React.useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const likeCount = toCount(localPost.likeCount);
  const commentCount = toCount(localPost.commentCount);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasLiked = localPost.isLiked;
    const newLikeCount = wasLiked ? likeCount - 1 : likeCount + 1;
    // Optimistic update
    const updated = { ...localPost, isLiked: !wasLiked, likeCount: newLikeCount };
    setLocalPost(updated);
    onUpdate?.(updated);
    try {
      if (wasLiked) {
        await api.delete(`/posts/${localPost.id}/like`);
      } else {
        await api.post(`/posts/${localPost.id}/like`);
      }
    } catch {
      // Revert
      setLocalPost(localPost);
      onUpdate?.(localPost);
    }
  }, [localPost, likeCount, onUpdate]);

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasBookmarked = localPost.isBookmarked;
    const updated = { ...localPost, isBookmarked: !wasBookmarked };
    setLocalPost(updated);
    onUpdate?.(updated);
    try {
      if (wasBookmarked) {
        await api.delete(`/posts/${localPost.id}/bookmark`);
      } else {
        await api.post(`/posts/${localPost.id}/bookmark`);
      }
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    }
  }, [localPost, onUpdate]);

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPost.username) {
      onUserClick?.(localPost.username);
      navigate(`/app/profile/${localPost.username}`);
    }
  };

  const handlePostClick = () => {
    onPostClick?.(localPost);
    navigate(`/app/post/${localPost.id}`);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/app/post/${localPost.id}?focus=comment`);
  };

  // Build images array
  const images = localPost.imageUrls && localPost.imageUrls.length > 0
    ? localPost.imageUrls
    : [{ imageUrl: localPost.imageUrl, thumbnailUrl: localPost.thumbnailUrl, filterName: localPost.filterName }];

  return (
    <article className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <Avatar
          src={localPost.avatarUrl}
          username={localPost.username}
          size="md"
          onClick={() => {
            if (localPost.username) {
              onUserClick?.(localPost.username);
              navigate(`/app/profile/${localPost.username}`);
            }
          }}
        />
        <div className={styles.headerInfo}>
          <div className={styles.username} onClick={handleUserClick}>
            {localPost.username || localPost.displayName || 'user'}
          </div>
          {localPost.locationName && (
            <div className={styles.location}>{localPost.locationName}</div>
          )}
        </div>
        <button className={styles.moreBtn} aria-label="More options">···</button>
      </div>

      {/* Image */}
      <div onClick={handlePostClick} style={{ cursor: 'pointer' }}>
        <ImageCarousel images={images} filterName={localPost.filterName} />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${localPost.isLiked ? styles.liked : ''}`}
          onClick={handleLike}
          aria-label={localPost.isLiked ? 'Unlike' : 'Like'}
          style={{ color: localPost.isLiked ? 'var(--accent-red)' : 'var(--text-primary)' }}
        >
          <HeartIcon filled={localPost.isLiked} />
        </button>
        {!localPost.commentsDisabled && (
          <button
            className={styles.actionBtn}
            onClick={handleCommentClick}
            aria-label="Comment"
          >
            <CommentIcon />
          </button>
        )}
        <div className={styles.spacer} />
        <button
          className={`${styles.actionBtn} ${localPost.isBookmarked ? styles.bookmarked : ''}`}
          onClick={handleBookmark}
          aria-label={localPost.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <BookmarkIcon filled={localPost.isBookmarked} />
        </button>
      </div>

      {/* Meta */}
      <div className={styles.meta}>
        {likeCount > 0 && (
          <div className={styles.likeCount}>
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </div>
        )}
        {localPost.caption && (
          <div className={styles.caption}>
            <span className={styles.captionUsername} onClick={handleUserClick}>
              {localPost.username}
            </span>
            <TextEntityRenderer text={localPost.caption} />
          </div>
        )}
        {localPost.commentsDisabled ? (
          <div className={styles.commentsDisabled}>Comments disabled</div>
        ) : commentCount > 0 ? (
          <div className={styles.viewComments} onClick={handlePostClick}>
            View all {commentCount.toLocaleString()} comments
          </div>
        ) : null}
        <div className={styles.timestamp}>{timeAgo(localPost.createdAt)}</div>
      </div>
    </article>
  );
}
