import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RightAside.module.css';
import { Avatar } from './Avatar';
import { api } from '../api/client';
import { Post, User } from '../models';

interface Suggestion {
  user: User;
  reason: string;
}

export function RightAside() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    // Derive suggestions from explore posts (same pattern as FeedPage sidebar)
    api.getPaginated<Post>('/explore')
      .then(({ items: posts }) => {
        const seen = new Set<string>();
        const derived: Suggestion[] = [];
        for (const p of posts) {
          if (!p.userId || !p.username || seen.has(p.userId)) continue;
          seen.add(p.userId);

          const isRemote = !!p.remoteDomain;
          const reason = isRemote
            ? 'Popular on fediverse'
            : `Popular on Infotograf`;

          derived.push({
            user: {
              id: p.userId,
              username: p.username,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              isPrivate: false,
              createdAt: p.createdAt,
              postCount: 0,
              followerCount: 0,
              followingCount: 0,
              isFollowing: false,
              isBlocked: false,
              isMuted: false,
              federationEnabled: isRemote,
            },
            reason,
          });
          if (derived.length >= 5) break;
        }
        setSuggestions(derived);
      })
      .catch(() => {});

    // Fetch trending hashtags
    api.get<{ name: string; postCount: number }[]>('/explore/hashtags/search?q=')
      .then(data => {
        const names = (Array.isArray(data) ? data : []).map(t => t.name).slice(0, 12);
        setTags(names);
      })
      .catch(() => {
        // Fallback: show a handful of static tags
        setTags(['photography', 'vintage', 'film', 'streetphotography', 'analog', 'portrait']);
      });
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
    <aside className={styles.aside}>
      {/* Suggestions For You */}
      {suggestions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Suggestions For You</div>
          {suggestions.map(({ user: u, reason }) => {
            const isFollowing = followed[u.id] ?? u.isFollowing;
            return (
              <div key={u.id} className={styles.suggestItem}>
                <div
                  className={styles.suggestAvatar}
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <Avatar
                    src={u.avatarUrl}
                    username={u.username}
                    size="sm"
                    isRemote={u.federationEnabled}
                  />
                </div>
                <div
                  className={styles.suggestInfo}
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <div className={styles.suggestName}>
                    {u.username}
                    {u.federationEnabled && (
                      <span className="fed-tag">FED</span>
                    )}
                  </div>
                  <div className={styles.suggestReason}>{reason}</div>
                </div>
                <button
                  className={`${styles.followBtn} ${isFollowing ? styles.followBtnFollowing : ''}`}
                  onClick={() => handleFollow(u)}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Trending */}
      {tags.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Trending</div>
          <div className={styles.tagList}>
            {tags.map(tag => (
              <button
                key={tag}
                className={styles.tagPill}
                onClick={() => navigate(`/explore?tag=${encodeURIComponent(tag)}`)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className={styles.footer}>
        <span className={styles.footerLinks}>
          <a href="/about">About</a>
          {' \u00B7 '}
          <a href="/privacy">Privacy</a>
          {' \u00B7 '}
          <a href="/terms">Terms</a>
          {' \u00B7 '}
          <a href="/api">API</a>
          {' \u00B7 '}
          <a href="/rss">RSS</a>
        </span>
        <span className={styles.footerCopy}>&copy; 2026 Infotograf</span>
      </div>
    </aside>
  );
}
