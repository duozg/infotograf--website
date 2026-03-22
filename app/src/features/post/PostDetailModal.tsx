import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styles from './PostDetailModal.module.css';
import { Avatar } from '../../components/Avatar';
import { ImageCarousel } from '../../components/ImageCarousel';
import { TextEntityRenderer } from '../../components/TextEntityRenderer';
import { api } from '../../api/client';
import { Post, Comment } from '../../models';
import { parsePaginated } from '../../api/client';
import { FediverseIcon } from '../../components/FediverseIcon';
import { timeAgo } from '../../utils/timeAgo';
import { toCount } from '../../utils/textParser';
import { useAuth } from '../../context/AuthContext';

interface PostDetailModalProps {
  postId?: string;
  onClose?: () => void;
  asPage?: boolean;
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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

export function PostDetailModal({ postId: propPostId, onClose, asPage }: PostDetailModalProps) {
  const { postId: paramPostId } = useParams();
  const postId = propPostId || paramPostId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCursor, setCommentCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    async function fetchPost() {
      // Try local post first
      let p: Post | null = null;
      try {
        p = await api.get<Post>(`/posts/${postId}`);
      } catch {
        // If local post not found, try remote post
        try {
          p = await api.get<Post>(`/remote-posts/${postId}`);
        } catch { /* not found */ }
      }
      if (!p) { setLoading(false); return; }
      setPost(p);

      const commentsEndpoint = p.remotePostId
        ? `/remote-posts/${p.remotePostId}/comments`
        : `/posts/${p.id}/comments`;
      try {
        const c = await api.getPaginated<Comment>(commentsEndpoint);
        setComments(c.items);
        setCommentCursor(c.nextCursor);
      } catch { /* no comments */ }
      setLoading(false);
    }
    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (searchParams.get('focus') === 'comment') {
      setTimeout(() => commentInputRef.current?.focus(), 300);
    }
  }, [searchParams]);

  // Remote posts use /remote-posts/:remotePostId/* endpoints
  const postEndpoint = post?.remotePostId
    ? `/remote-posts/${post.remotePostId}`
    : `/posts/${postId}`;

  const handleLike = useCallback(async () => {
    if (!post) return;
    const wasLiked = post.isLiked;
    const newCount = toCount(post.likeCount) + (wasLiked ? -1 : 1);
    setPost(p => p ? { ...p, isLiked: !wasLiked, likeCount: newCount } : p);
    try {
      if (wasLiked) await api.delete(`${postEndpoint}/like`);
      else await api.post(`${postEndpoint}/like`);
    } catch {
      setPost(p => p ? { ...p, isLiked: wasLiked, likeCount: post.likeCount } : p);
    }
  }, [post, postEndpoint]);

  const handleBookmark = useCallback(async () => {
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    setPost(p => p ? { ...p, isBookmarked: !wasBookmarked } : p);
    try {
      if (wasBookmarked) await api.delete(`${postEndpoint}/bookmark`);
      else await api.post(`${postEndpoint}/bookmark`);
    } catch {
      setPost(p => p ? { ...p, isBookmarked: wasBookmarked } : p);
    }
  }, [post, postEndpoint]);

  const handleSendComment = useCallback(async () => {
    if (!post || !commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const body = commentText.trim();
    setCommentText('');
    const parentId = replyTo?.id;
    setReplyTo(null);
    try {
      const newComment = await api.post<Comment>(`${postEndpoint}/comments`, { body, parentId });
      setComments(prev => [...prev, newComment]);
      setPost(p => p ? { ...p, commentCount: toCount(p.commentCount) + 1 } : p);
    } catch {
      setCommentText(body);
    } finally {
      setSendingComment(false);
    }
  }, [post, postEndpoint, commentText, sendingComment, replyTo]);

  const handleSaveCaption = useCallback(async () => {
    if (!post) return;
    const caption = captionDraft.trim();
    setPost(p => p ? { ...p, caption } : p);
    setEditingCaption(false);
    try {
      await api.patch(`/posts/${post.id}`, { caption });
    } catch {
      setPost(p => p ? { ...p, caption: post.caption } : p);
    }
  }, [post, captionDraft]);

  const handleToggleComments = useCallback(async () => {
    if (!post) return;
    const newVal = !post.commentsDisabled;
    setPost(p => p ? { ...p, commentsDisabled: newVal } : p);
    setShowOwnerMenu(false);
    try {
      await api.patch(`/posts/${post.id}`, { commentsDisabled: newVal });
    } catch {
      setPost(p => p ? { ...p, commentsDisabled: post.commentsDisabled } : p);
    }
  }, [post]);

  const handleDeletePost = useCallback(async () => {
    if (!post) return;
    setShowOwnerMenu(false);
    try {
      await api.delete(`/posts/${post.id}`);
      onClose?.();
      navigate(-1);
    } catch {}
  }, [post, onClose, navigate]);

  const handleDeleteComment = useCallback(async (comment: Comment) => {
    if (!post) return;
    setComments(prev => prev.filter(c => c.id !== comment.id));
    setPost(p => p ? { ...p, commentCount: Math.max(0, toCount(p.commentCount) - 1) } : p);
    try {
      await api.delete(`${postEndpoint}/comments/${comment.id}`);
    } catch {
      setComments(prev => [...prev, comment]);
      setPost(p => p ? { ...p, commentCount: toCount(p.commentCount) + 1 } : p);
    }
  }, [post, postEndpoint]);

  const handleLikeComment = useCallback(async (comment: Comment) => {
    if (!post) return;
    const wasLiked = comment.isLiked;
    const newCount = toCount(comment.likeCount) + (wasLiked ? -1 : 1);
    setComments(prev => prev.map(c =>
      c.id === comment.id ? { ...c, isLiked: !wasLiked, likeCount: newCount } : c
    ));
    try {
      // Comment likes only work on local posts (no remote-posts comment like endpoint)
      if (!post.remotePostId) {
        if (wasLiked) await api.delete(`/posts/${post.id}/comments/${comment.id}/like`);
        else await api.post(`/posts/${post.id}/comments/${comment.id}/like`);
      }
    } catch {
      setComments(prev => prev.map(c => c.id === comment.id ? comment : c));
    }
  }, [post]);

  const loadMoreComments = useCallback(async () => {
    if (!post || !commentCursor) return;
    try {
      const { items, nextCursor } = await api.getPaginated<Comment>(
        `${postEndpoint}/comments?cursor=${commentCursor}`
      );
      setComments(prev => [...prev, ...items]);
      setCommentCursor(nextCursor);
    } catch {}
  }, [post, postEndpoint, commentCursor]);

  if (!postId) return null;

  if (loading) {
    return asPage ? (
      <div className={styles.page}>
        <div className={styles.loadingState}>Loading…</div>
      </div>
    ) : (
      <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
        <div className={styles.modal}>
          <div className={styles.loadingState}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const images = post.imageUrls && post.imageUrls.length > 0
    ? post.imageUrls
    : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl, filterName: post.filterName }];

  /* ── Shared right panel content ── */
  const rightPanel = (
    <>
      {/* Header */}
      <div className={styles.header}>
        <Avatar
          src={post.avatarUrl}
          username={post.username}
          size="md"
          onClick={() => navigate(`/profile/${post.username}`)}
        />
        <div className={styles.userInfo}>
          <div className={styles.usernameRow}>
            <span
              className={styles.username}
              style={post.remoteDomain ? { color: 'var(--fediverse-purple)' } : undefined}
              onClick={() => navigate(`/profile/${post.username}`)}
            >
              {post.username}
            </span>
            {post.remoteDomain && (
              <span className={styles.domainBadge}>
                <FediverseIcon size={10} />
                {post.remoteDomain}
              </span>
            )}
          </div>
          {post.locationName && <div className={styles.location}>{post.locationName}</div>}
        </div>
        {post.userId === user?.id && (
          <div style={{ position: 'relative' }}>
            <button
              className={styles.closeBtn}
              onClick={() => setShowOwnerMenu(v => !v)}
              aria-label="Post options"
              style={{ fontSize: 20 }}
            >···</button>
            {showOwnerMenu && (
              <div className={styles.ownerMenu}>
                <button
                  className={styles.ownerMenuItem}
                  onClick={() => {
                    setShowOwnerMenu(false);
                    setCaptionDraft(post.caption || '');
                    setEditingCaption(true);
                  }}
                >
                  Edit Caption
                </button>
                <button className={styles.ownerMenuItem} onClick={handleToggleComments}>
                  {post.commentsDisabled ? 'Enable Comments' : 'Disable Comments'}
                </button>
                <button
                  className={`${styles.ownerMenuItem} ${styles.ownerMenuItemDanger}`}
                  onClick={handleDeletePost}
                >
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        )}
      </div>

      {/* Scrollable: actions + meta + comments */}
      <div className={styles.scrollable}>
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${post.isLiked ? styles.liked : ''}`}
            onClick={handleLike}
            aria-label={post.isLiked ? 'Unlike' : 'Like'}
            style={{ color: post.isLiked ? 'var(--accent-red)' : undefined }}
          >
            <HeartIcon filled={post.isLiked} />
          </button>
          {!post.commentsDisabled && (
            <button
              className={styles.actionBtn}
              onClick={() => commentInputRef.current?.focus()}
              aria-label="Comment"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
          <div className={styles.spacer} />
          <button
            className={styles.actionBtn}
            onClick={handleBookmark}
            aria-label={post.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <BookmarkIcon filled={post.isBookmarked} />
          </button>
        </div>

        <div className={styles.meta}>
          {toCount(post.likeCount) > 0 && (
            <div className={styles.likeCount}>
              {toCount(post.likeCount).toLocaleString()} {toCount(post.likeCount) === 1 ? 'like' : 'likes'}
            </div>
          )}
          {editingCaption ? (
            <div className={styles.editCaptionWrap}>
              <textarea
                className={styles.editCaptionInput}
                value={captionDraft}
                onChange={e => setCaptionDraft(e.target.value)}
                autoFocus
                rows={3}
              />
              <div className={styles.editCaptionActions}>
                <button className={styles.sendBtn} onClick={handleSaveCaption}>Save</button>
                <button
                  className={styles.sendBtn}
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setEditingCaption(false)}
                >Cancel</button>
              </div>
            </div>
          ) : post.caption ? (
            <div className={styles.caption}>
              <span className={styles.captionUser} onClick={() => navigate(`/profile/${post.username}`)}>
                {post.username}
              </span>
              <TextEntityRenderer text={post.caption} />
            </div>
          ) : null}
          <div className={styles.timestamp}>{timeAgo(post.createdAt)}</div>
        </div>

        <div className={styles.comments}>
          {comments.map(comment => (
            <div key={comment.id} className={styles.comment}>
              <Avatar
                src={comment.avatarUrl}
                username={comment.username}
                size="sm"
                onClick={() => navigate(`/profile/${comment.username}`)}
              />
              <div className={styles.commentBody}>
                <div>
                  <span
                    className={styles.commentUser}
                    onClick={() => navigate(`/profile/${comment.username}`)}
                  >
                    {comment.username}
                  </span>
                  <TextEntityRenderer text={comment.body} className={styles.commentText} />
                </div>
                <div className={styles.commentMeta}>
                  <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
                  {toCount(comment.likeCount) > 0 && (
                    <span className={styles.commentTime}>{toCount(comment.likeCount)} likes</span>
                  )}
                  <button
                    className={`${styles.commentLikeBtn} ${comment.isLiked ? styles.liked : ''}`}
                    onClick={() => handleLikeComment(comment)}
                    aria-label={comment.isLiked ? 'Unlike comment' : 'Like comment'}
                  >
                    <svg viewBox="0 0 24 24" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} style={{ width: 12, height: 12 }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  {!post.commentsDisabled && (
                    <button
                      className={styles.replyBtn}
                      onClick={() => {
                        setReplyTo(comment);
                        setCommentText(`@${comment.username} `);
                        commentInputRef.current?.focus();
                      }}
                    >
                      Reply
                    </button>
                  )}
                  {comment.userId === user?.id && (
                    <button
                      className={styles.replyBtn}
                      style={{ color: 'var(--accent-red)' }}
                      onClick={() => handleDeleteComment(comment)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {commentCursor && (
            <button className={styles.loadMoreComments} onClick={loadMoreComments}>
              Load more comments…
            </button>
          )}
        </div>
      </div>

      {/* Comment input */}
      {!post.commentsDisabled && (
        <div className={styles.inputBar}>
          <Avatar src={user?.avatarUrl} username={user?.username} size="sm" />
          <textarea
            ref={commentInputRef}
            className={styles.commentInput}
            placeholder={replyTo ? `Reply to @${replyTo.username}…` : 'Add a comment…'}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSendComment}
            disabled={!commentText.trim() || sendingComment}
          >
            Post
          </button>
        </div>
      )}
    </>
  );

  /* ── Page variant: centered column ── */
  if (asPage) {
    return (
      <div className={styles.page}>
        <div className={styles.pageModal}>
          <div className={styles.imagePanel}>
            <ImageCarousel images={images} filterName={post.filterName} />
          </div>
          <div className={styles.rightPanel}>
            {rightPanel}
          </div>
        </div>
      </div>
    );
  }

  /* ── Modal overlay: side-by-side ── */
  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={styles.modal}>
        <div className={styles.imagePanel}>
          <ImageCarousel images={images} filterName={post.filterName} />
        </div>
        <div className={styles.rightPanel}>
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
