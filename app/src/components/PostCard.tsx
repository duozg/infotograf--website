import React, { useState, useCallback, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';

interface PostCardProps {
  post: Post;
  onPostClick?: (post: Post) => void;
  onUserClick?: (username: string) => void;
  onUpdate?: (updated: Post) => void;
  onDelete?: (postId: string) => void;
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

export function PostCard({ post, onPostClick, onUserClick, onUpdate, onDelete }: PostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [localPost, setLocalPost] = useState(post);
  const likeInProgressRef = useRef(false);
  const bookmarkInProgressRef = useRef(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');

  // Sync with parent
  React.useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const likeCount = toCount(localPost.likeCount);
  const commentCount = toCount(localPost.commentCount);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likeInProgressRef.current) return;
    likeInProgressRef.current = true;
    const wasLiked = localPost.isLiked;
    const newLikeCount = wasLiked ? likeCount - 1 : likeCount + 1;
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
      setLocalPost(localPost);
      onUpdate?.(localPost);
    } finally {
      likeInProgressRef.current = false;
    }
  }, [localPost, likeCount, onUpdate]);

  // Double-tap on image: only adds a like, never removes
  const handleDoubleTap = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPost.isLiked || likeInProgressRef.current) return;
    likeInProgressRef.current = true;
    const updated = { ...localPost, isLiked: true, likeCount: likeCount + 1 };
    setLocalPost(updated);
    onUpdate?.(updated);
    try {
      await api.post(`/posts/${localPost.id}/like`);
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    } finally {
      likeInProgressRef.current = false;
    }
  }, [localPost, likeCount, onUpdate]);

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarkInProgressRef.current) return;
    bookmarkInProgressRef.current = true;
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
    } finally {
      bookmarkInProgressRef.current = false;
    }
  }, [localPost, onUpdate]);

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPost.username) {
      onUserClick?.(localPost.username);
      navigate(`/profile/${localPost.username}`);
    }
  };

  const handlePostClick = () => {
    onPostClick?.(localPost);
    navigate(`/post/${localPost.id}`);
  };

  const handleSaveCaption = useCallback(async () => {
    const caption = captionDraft.trim();
    const updated = { ...localPost, caption };
    setLocalPost(updated);
    onUpdate?.(updated);
    setEditingCaption(false);
    try {
      await api.patch(`/posts/${localPost.id}`, { caption });
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    }
  }, [localPost, captionDraft, onUpdate]);

  const handleToggleComments = useCallback(async () => {
    setShowMenu(false);
    const newVal = !localPost.commentsDisabled;
    const updated = { ...localPost, commentsDisabled: newVal };
    setLocalPost(updated);
    onUpdate?.(updated);
    try {
      await api.patch(`/posts/${localPost.id}`, { commentsDisabled: newVal });
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    }
  }, [localPost, onUpdate]);

  const handleDeletePost = useCallback(async () => {
    setShowMenu(false);
    try {
      await api.delete(`/posts/${localPost.id}`);
      onDelete?.(localPost.id);
    } catch {}
  }, [localPost.id, onDelete]);

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/post/${localPost.id}?focus=comment`);
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
              navigate(`/profile/${localPost.username}`);
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
        {localPost.userId === user?.id && (
          <div style={{ position: 'relative' }}>
            <button
              className={styles.moreBtn}
              aria-label="More options"
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
            >···</button>
            {showMenu && (
              <div className={styles.cardMenu}>
                <button
                  className={styles.cardMenuItem}
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setCaptionDraft(localPost.caption || '');
                    setEditingCaption(true);
                  }}
                >
                  Edit Caption
                </button>
                <button
                  className={styles.cardMenuItem}
                  onClick={e => { e.stopPropagation(); handleToggleComments(); }}
                >
                  {localPost.commentsDisabled ? 'Enable Comments' : 'Disable Comments'}
                </button>
                <button
                  className={`${styles.cardMenuItem} ${styles.cardMenuItemDanger}`}
                  onClick={e => { e.stopPropagation(); handleDeletePost(); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image */}
      <div onClick={handlePostClick} onDoubleClick={handleDoubleTap} style={{ cursor: 'pointer' }}>
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
        {editingCaption ? (
          <div className={styles.editCaptionWrap} onClick={e => e.stopPropagation()}>
            <textarea
              className={styles.editCaptionInput}
              value={captionDraft}
              onChange={e => setCaptionDraft(e.target.value)}
              autoFocus
              rows={2}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className={styles.editCaptionSave} onClick={handleSaveCaption}>Save</button>
              <button className={styles.editCaptionCancel} onClick={() => setEditingCaption(false)}>Cancel</button>
            </div>
          </div>
        ) : localPost.caption ? (
          <div className={styles.caption}>
            <span className={styles.captionUsername} onClick={handleUserClick}>
              {localPost.username}
            </span>
            <TextEntityRenderer text={localPost.caption} />
          </div>
        ) : null}
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
