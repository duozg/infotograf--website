import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Post } from '../models';
import { imageUrl } from '../utils/imageUrl';

interface SharedPostBubbleProps {
  postId: string;
}

export function SharedPostBubble({ postId }: SharedPostBubbleProps) {
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get<Post>(`/posts/${postId}`)
      .then(p => setPost(p))
      .catch(() => setFailed(true));
  }, [postId]);

  if (failed) {
    return (
      <div style={{
        fontSize: 13,
        color: 'var(--text-tertiary)',
        fontStyle: 'italic',
        padding: '4px 0',
      }}>
        Post unavailable
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{
        width: 200,
        height: 80,
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        opacity: 0.6,
      }} />
    );
  }

  const images = post.imageUrls && post.imageUrls.length > 0
    ? post.imageUrls
    : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
  const thumb = imageUrl(images[0]?.thumbnailUrl || images[0]?.url || images[0]?.imageUrl);

  return (
    <div
      onClick={() => navigate(`/post/${post.id}`)}
      style={{
        cursor: 'pointer',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--border-primary)',
        maxWidth: 220,
        background: 'var(--bg-elevated)',
      }}
    >
      {thumb && (
        <img
          src={thumb}
          alt=""
          style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
        />
      )}
      <div style={{ padding: '6px 8px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          @{post.username}
        </div>
        {post.caption && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 2,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {post.caption}
          </div>
        )}
      </div>
    </div>
  );
}

/** Parse a message body and return the shared post ID if the body is a shared post token */
export function parseSharedPostId(body: string | undefined): string | null {
  if (!body) return null;
  const match = body.match(/^\[shared_post:([^\]]+)\]$/);
  return match ? match[1] : null;
}
