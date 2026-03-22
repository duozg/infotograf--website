import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PostCard.module.css';
import { Post, User } from '../models';
import { Avatar } from './Avatar';
import { ImageCarousel } from './ImageCarousel';
import { TextEntityRenderer } from './TextEntityRenderer';
import { timeAgo } from '../utils/timeAgo';
import { imageUrl } from '../utils/imageUrl';
import { toCount } from '../utils/textParser';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FediverseIcon } from './FediverseIcon';
import { RemoteActorModal } from '../features/fediverse/RemoteActorModal';

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

function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  return (
    <div className={styles.audioPlayer}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={e => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
      />
      <button onClick={e => { e.stopPropagation(); toggle(); }} className={styles.audioPlayBtn}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className={styles.audioBarWrap} onClick={e => e.stopPropagation()}>
        <div className={styles.audioBarFill} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
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
  const [showHeart, setShowHeart] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [likedByUsers, setLikedByUsers] = useState<User[] | null>(null);
  const [remoteActorId, setRemoteActorId] = useState<string | null>(null);

  // Sync with parent
  React.useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const likeCount = toCount(localPost.likeCount);
  const commentCount = toCount(localPost.commentCount);

  // Remote posts use /remote-posts/:remotePostId/* endpoints
  const postEndpoint = localPost.remotePostId
    ? `/remote-posts/${localPost.remotePostId}`
    : `/posts/${localPost.id}`;
  const isRemote = !!localPost.remotePostId;

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
        await api.delete(`${postEndpoint}/like`);
      } else {
        await api.post(`${postEndpoint}/like`);
      }
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    } finally {
      likeInProgressRef.current = false;
    }
  }, [localPost, likeCount, onUpdate, postEndpoint]);

  // Double-tap on image: only adds a like, never removes
  const handleDoubleTap = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPost.isLiked || likeInProgressRef.current) return;
    likeInProgressRef.current = true;
    const updated = { ...localPost, isLiked: true, likeCount: likeCount + 1 };
    setLocalPost(updated);
    onUpdate?.(updated);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
    try {
      await api.post(`${postEndpoint}/like`);
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    } finally {
      likeInProgressRef.current = false;
    }
  }, [localPost, likeCount, onUpdate, postEndpoint]);

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
        await api.delete(`${postEndpoint}/bookmark`);
      } else {
        await api.post(`${postEndpoint}/bookmark`);
      }
    } catch {
      setLocalPost(localPost);
      onUpdate?.(localPost);
    } finally {
      bookmarkInProgressRef.current = false;
    }
  }, [localPost, onUpdate, postEndpoint]);

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPost.remoteDomain && localPost.remoteActorId) {
      setRemoteActorId(localPost.remoteActorId);
    } else if (localPost.remoteDomain && localPost.userId) {
      setRemoteActorId(localPost.userId);
    } else if (localPost.username) {
      onUserClick?.(localPost.username);
      navigate(`/profile/${localPost.username}`);
    }
  };

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick(localPost);
    } else {
      // Fallback: navigate directly (for contexts without modal support)
      const detailId = localPost.remotePostId || localPost.id;
      navigate(`/post/${detailId}`);
    }
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
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setShowMenu(false);
    try {
      await api.delete(`/posts/${localPost.id}`);
      onDelete?.(localPost.id);
    } catch {}
  }, [localPost.id, onDelete]);

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const detailId = localPost.remotePostId || localPost.id;
    navigate(`/post/${detailId}?focus=comment`);
  };

  const fetchLikedBy = useCallback(async () => {
    try {
      const { items } = await api.getPaginated<User>(`${postEndpoint}/liked-by`);
      setLikedByUsers(items);
    } catch {
      setLikedByUsers(null);
    }
  }, [postEndpoint]);

  // Build images array — skip if no image at all (text-only posts)
  const hasImage = localPost.imageUrl || (localPost.imageUrls && localPost.imageUrls.length > 0);
  const images = localPost.imageUrls && localPost.imageUrls.length > 0
    ? localPost.imageUrls
    : localPost.imageUrl ? [{ imageUrl: localPost.imageUrl, thumbnailUrl: localPost.thumbnailUrl, filterName: localPost.filterName }] : [];

  return (
    <>
      <article className={`${styles.card} ${localPost.remoteDomain ? styles.federated : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <Avatar
            src={localPost.avatarUrl}
            username={localPost.username}
            size="md"
            isRemote={!!localPost.remoteDomain}
            onClick={() => {
              if (localPost.remoteDomain && localPost.remoteActorId) {
                setRemoteActorId(localPost.remoteActorId);
              } else if (localPost.remoteDomain && localPost.userId) {
                setRemoteActorId(localPost.userId);
              } else if (localPost.username) {
                onUserClick?.(localPost.username);
                navigate(`/profile/${localPost.username}`);
              }
            }}
          />
          <div className={styles.headerInfo}>
            <div className={styles.headerNameRow}>
              <div
                className={`${styles.username} ${localPost.remoteDomain ? styles.usernameRemote : ''}`}
                onClick={handleUserClick}
              >
                {localPost.username || localPost.displayName || 'user'}
              </div>
              {localPost.remoteDomain && (
                <span className={styles.domainBadge}>
                  <FediverseIcon size={10} />
                  {localPost.remoteDomain}
                </span>
              )}
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

        {/* Image + audio overlay (skip for text-only posts) */}
        {hasImage && (
        <div onClick={handlePostClick} onDoubleClick={handleDoubleTap} style={{ cursor: 'pointer', position: 'relative' }}>
          <ImageCarousel images={images} filterName={localPost.filterName} />
          {localPost.audioUrl && (
            <div className={styles.audioPill} onClick={e => e.stopPropagation()}>
              <div className={styles.wave}>
                {[0, 1, 2, 3, 4].map(i => (
                  <span
                    key={i}
                    className={styles.waveBar}
                    style={localPost.audioType === 'voice' ? { background: 'var(--voice-blue)' } : undefined}
                  />
                ))}
              </div>
              {localPost.audioType === 'voice' ? 'Voice note' : 'Ambient'} · {Math.floor((localPost.audioDuration || 0) / 1000)}:{String(Math.floor(((localPost.audioDuration || 0) % 1000) / 10)).padStart(2, '0')}
            </div>
          )}
          {showHeart && (
            <div className={styles.heartFlash}>
              <span className={styles.heartFlashIcon}>❤️</span>
            </div>
          )}
        </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${localPost.isLiked ? styles.liked : ''}`}
            onClick={handleLike}
            aria-label={localPost.isLiked ? 'Unlike' : 'Like'}
            style={{ color: localPost.isLiked ? 'var(--red)' : 'var(--t1)' }}
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
            <div
              className={styles.likeCount}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setLikedByUsers([]); fetchLikedBy(); }}
            >
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
            <div className={`${styles.caption} ${!captionExpanded && localPost.caption.length > 120 ? styles.captionTruncated : ''}`}>
              <span
                className={`${styles.captionUsername} ${localPost.remoteDomain ? styles.usernameRemote : ''}`}
                onClick={handleUserClick}
              >
                {localPost.username}
              </span>
              {captionExpanded || localPost.caption.length <= 120 ? (
                <TextEntityRenderer text={localPost.caption} />
              ) : (
                <>
                  <TextEntityRenderer text={localPost.caption.slice(0, 120) + '...'} />
                  <button className={styles.moreBtn2} onClick={() => setCaptionExpanded(true)}>more</button>
                </>
              )}
            </div>
          ) : null}
          {localPost.commentsDisabled ? (
            <div className={styles.commentsDisabled}>Comments disabled</div>
          ) : commentCount > 0 ? (
            <div className={styles.viewComments} onClick={handlePostClick}>
              View all {commentCount.toLocaleString()} comments
            </div>
          ) : null}
          <div className={styles.timestamp}>
            {timeAgo(localPost.createdAt)}
            {localPost.remoteDomain && (
              <span className={styles.timestampDomain}> · {localPost.remoteDomain}</span>
            )}
          </div>
        </div>

        {/* Comment bar removed — comments are in the post detail modal */}
      </article>

      {remoteActorId && (
        <RemoteActorModal
          remoteActorId={remoteActorId}
          onClose={() => setRemoteActorId(null)}
        />
      )}

      {likedByUsers !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          }}
          onClick={() => setLikedByUsers(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)', borderRadius: 12, width: 360, maxWidth: '90vw',
              maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--divider-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Liked by</span>
              <button
                onClick={() => setLikedByUsers(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-secondary)', lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {likedByUsers.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  Loading…
                </div>
              )}
              {likedByUsers.map(u => (
                <div
                  key={u.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
                  onClick={() => { setLikedByUsers(null); navigate(`/profile/${u.username}`); }}
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</div>
                    {u.displayName && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.displayName}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
