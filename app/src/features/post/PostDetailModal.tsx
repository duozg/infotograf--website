import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styles from './PostDetailModal.module.css';
import { Avatar } from '../../components/Avatar';
import { ImageCarousel } from '../../components/ImageCarousel';
import { TextEntityRenderer } from '../../components/TextEntityRenderer';
import { HeaderBar } from '../../components/HeaderBar';
import { api } from '../../api/client';
import { Post, Comment, PaginatedResponse } from '../../models';
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

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    Promise.all([
      api.get<Post>(`/posts/${postId}`),
      api.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments`),
    ]).then(([p, c]) => {
      setPost(p);
      setComments(c.items);
      setCommentCursor(c.nextCursor);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [postId]);

  // Auto-focus comment input if ?focus=comment
  useEffect(() => {
    if (searchParams.get('focus') === 'comment') {
      setTimeout(() => commentInputRef.current?.focus(), 300);
    }
  }, [searchParams]);

  const handleLike = useCallback(async () => {
    if (!post) return;
    const wasLiked = post.isLiked;
    const newCount = toCount(post.likeCount) + (wasLiked ? -1 : 1);
    setPost(p => p ? { ...p, isLiked: !wasLiked, likeCount: newCount } : p);
    try {
      if (wasLiked) await api.delete(`/posts/${post.id}/like`);
      else await api.post(`/posts/${post.id}/like`);
    } catch {
      setPost(p => p ? { ...p, isLiked: wasLiked, likeCount: post.likeCount } : p);
    }
  }, [post]);

  const handleBookmark = useCallback(async () => {
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    setPost(p => p ? { ...p, isBookmarked: !wasBookmarked } : p);
    try {
      if (wasBookmarked) await api.delete(`/posts/${post.id}/bookmark`);
      else await api.post(`/posts/${post.id}/bookmark`);
    } catch {
      setPost(p => p ? { ...p, isBookmarked: wasBookmarked } : p);
    }
  }, [post]);

  const handleSendComment = useCallback(async () => {
    if (!post || !commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const body = commentText.trim();
    setCommentText('');
    const parentId = replyTo?.id;
    setReplyTo(null);
    try {
      const newComment = await api.post<Comment>(`/posts/${post.id}/comments`, {
        body,
        parentId,
      });
      setComments(prev => [newComment, ...prev]);
      setPost(p => p ? { ...p, commentCount: toCount(p.commentCount) + 1 } : p);
    } catch (e) {
      setCommentText(body);
    } finally {
      setSendingComment(false);
    }
  }, [post, commentText, sendingComment, replyTo]);

  const handleLikeComment = useCallback(async (comment: Comment) => {
    const wasLiked = comment.isLiked;
    const newCount = toCount(comment.likeCount) + (wasLiked ? -1 : 1);
    setComments(prev => prev.map(c =>
      c.id === comment.id ? { ...c, isLiked: !wasLiked, likeCount: newCount } : c
    ));
    try {
      if (wasLiked) await api.delete(`/comments/${comment.id}/like`);
      else await api.post(`/comments/${comment.id}/like`);
    } catch {
      setComments(prev => prev.map(c =>
        c.id === comment.id ? comment : c
      ));
    }
  }, []);

  const loadMoreComments = useCallback(async () => {
    if (!post || !commentCursor) return;
    try {
      const res = await api.get<PaginatedResponse<Comment>>(
        `/posts/${post.id}/comments?cursor=${commentCursor}`
      );
      setComments(prev => [...prev, ...res.items]);
      setCommentCursor(res.nextCursor);
    } catch {}
  }, [post, commentCursor]);

  if (!postId) return null;

  const content = (
    <>
      {loading && (
        <div className={styles.loadingState}>Loading…</div>
      )}

      {post && (
        <>
          {/* Post Header */}
          <div className={styles.header}>
            <Avatar
              src={post.avatarUrl}
              username={post.username}
              size="md"
              className={styles.avatar}
              onClick={() => navigate(`/profile/${post.username}`)}
            />
            <div className={styles.userInfo}>
              <div className={styles.username} onClick={() => navigate(`/profile/${post.username}`)}>
                {post.username}
              </div>
              {post.locationName && <div className={styles.location}>{post.locationName}</div>}
            </div>
            {onClose && (
              <button className={styles.closeBtn} onClick={onClose}>×</button>
            )}
          </div>

          {/* Image */}
          <div className={styles.imageSection}>
            {(() => {
              const images = post.imageUrls && post.imageUrls.length > 0
                ? post.imageUrls
                : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl, filterName: post.filterName }];
              return <ImageCarousel images={images} filterName={post.filterName} />;
            })()}
          </div>

          <div className={styles.scrollable}>
            {/* Actions */}
            <div className={styles.actions}>
              <button
                className={`${styles.actionBtn} ${post.isLiked ? styles.liked : ''}`}
                onClick={handleLike}
                aria-label={post.isLiked ? 'Unlike' : 'Like'}
                style={{ color: post.isLiked ? 'var(--accent-red)' : 'var(--text-primary)' }}
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
                className={`${styles.actionBtn} ${post.isBookmarked ? '' : ''}`}
                onClick={handleBookmark}
                aria-label={post.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <BookmarkIcon filled={post.isBookmarked} />
              </button>
            </div>

            {/* Meta */}
            <div className={styles.meta}>
              {toCount(post.likeCount) > 0 && (
                <div className={styles.likeCount}>
                  {toCount(post.likeCount).toLocaleString()} {toCount(post.likeCount) === 1 ? 'like' : 'likes'}
                </div>
              )}
              {post.caption && (
                <div className={styles.caption}>
                  <span
                    className={styles.captionUser}
                    onClick={() => navigate(`/profile/${post.username}`)}
                  >
                    {post.username}
                  </span>
                  <TextEntityRenderer text={post.caption} />
                </div>
              )}
              <div className={styles.timestamp}>{timeAgo(post.createdAt)}</div>
            </div>

            {/* Comments */}
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

          {/* Comment Input */}
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
      )}
    </>
  );

  if (asPage) {
    return (
      <div className={styles.page}>
        <HeaderBar title="Post" onBack={() => navigate(-1)} />
        <div style={{ marginTop: 44 }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={styles.modal}>
        {content}
      </div>
    </div>
  );
}
