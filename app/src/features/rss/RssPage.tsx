import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RssPage.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../models';

const API_BASE = 'https://noiscut-api-production.up.railway.app/api';

function RssIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="19" r="2" fill="currentColor" />
      <path d="M4 11a8 8 0 0 1 8 8" />
      <path d="M4 4a15 15 0 0 1 15 15" />
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={styles.copyBtn} onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function RssPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.getPaginated<User>('/follows/following')
      .then(({ items }) => setFollowing(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const myFeedUrl = user ? `${API_BASE}/users/${user.username}/rss` : '';

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}><RssIcon size={24} /></div>
        <div>
          <h1 className={styles.title}>RSS Feeds</h1>
          <p className={styles.subtitle}>Subscribe to any public profile with your favorite RSS reader</p>
        </div>
      </div>

      {/* Your feed */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>Your RSS Feed</div>
        <p className={styles.cardDesc}>
          Share this URL so others can follow your posts in any RSS reader (Feedly, NetNewsWire, Inoreader, etc.)
        </p>
        <div className={styles.feedUrlRow}>
          <input
            className={styles.feedUrlInput}
            value={myFeedUrl}
            readOnly
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <CopyButton text={myFeedUrl} />
        </div>
        <a href={myFeedUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
          Preview feed →
        </a>
      </div>

      {/* People you follow */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>Feeds from people you follow</div>
        <p className={styles.cardDesc}>
          Copy any feed URL below to add it to your RSS reader.
        </p>

        {loading && (
          <div className={styles.empty}>Loading…</div>
        )}

        {!loading && following.length === 0 && (
          <div className={styles.empty}>
            You're not following anyone yet. Follow some people to see their RSS feeds here.
          </div>
        )}

        <div className={styles.feedList}>
          {following.map(u => {
            const feedUrl = `${API_BASE}/users/${u.username}/rss`;
            return (
              <div key={u.id} className={styles.feedItem}>
                <div
                  className={styles.feedUser}
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                  <div className={styles.feedUserInfo}>
                    <span className={styles.feedUsername}>{u.username}</span>
                    {u.displayName && <span className={styles.feedDisplayName}>{u.displayName}</span>}
                  </div>
                </div>
                <div className={styles.feedActions}>
                  <CopyButton text={feedUrl} />
                  <a
                    href={feedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.feedPreview}
                    title="Preview feed"
                  >
                    <RssIcon size={16} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>What is RSS?</div>
        <p className={styles.cardDesc}>
          RSS (Really Simple Syndication) lets you subscribe to content from any website using a feed reader app.
          When someone posts a new photo on Infotograf, it automatically appears in your reader — no algorithm, no ads, just chronological updates.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <span>Get an RSS reader app (Feedly, NetNewsWire, Inoreader)</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <span>Copy a feed URL from above</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <span>Paste it into your reader — done! New posts appear automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
