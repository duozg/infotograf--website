import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TopNav.module.css';
import { useAppState } from '../context/AppStateContext';
import { FediverseIcon } from './FediverseIcon';
import { api, parsePaginated } from '../api/client';
import { AppNotification } from '../models';
import { Avatar } from './Avatar';
import { timeAgo } from '../utils/timeAgo';
import { imageUrl } from '../utils/imageUrl';

function notifText(n: AppNotification): { main: string; action: string } {
  const count = n.coalescedCount && n.coalescedCount > 1 ? n.coalescedCount : null;
  const actor = n.actorUsername || 'Someone';
  const countStr = count ? ` and ${count - 1} other${count - 1 > 1 ? 's' : ''}` : '';

  switch (n.type) {
    case 'like':
      return { main: `${actor}${countStr}`, action: ' liked your photo.' };
    case 'comment':
      return { main: `${actor}${countStr}`, action: ` commented: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'follow':
      return { main: `${actor}${countStr}`, action: ' started following you.' };
    case 'mention':
      return { main: `${actor}`, action: ` mentioned you in a comment: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'commentReply':
      return { main: `${actor}`, action: ` replied: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'commentLike':
      return { main: `${actor}${countStr}`, action: ' liked your comment.' };
    default:
      return { main: actor, action: ' interacted with you.' };
  }
}

export function TopNav({ onNewPost }: { onNewPost: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotifications, unreadMessages, clearNotifications } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifItems, setNotifItems] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const raw = await api.get<unknown>('/notifications');
      const { items } = parsePaginated<AppNotification>(raw);
      setNotifItems(items);
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showNotifDropdown) {
      fetchNotifications();
      const timer = setTimeout(() => {
        api.post('/notifications/read').catch(() => {});
        clearNotifications();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showNotifDropdown, fetchNotifications, clearNotifications]);

  const handleNotifClick = (notif: AppNotification) => {
    setShowNotifDropdown(false);
    if (notif.postId) navigate(`/post/${notif.postId}`);
    else if (notif.actorUsername) navigate(`/profile/${notif.actorUsername}`);
  };

  const path = location.pathname;
  const isHome = path === '/';
  const isFediverse = path.startsWith('/fediverse');
  const isMessages = path.startsWith('/messages');
  const isActivity = path.startsWith('/activity');
  const isProfile = path === '/profile' || path.startsWith('/profile/');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
    setSearchQuery('');
  };

  return (
    <header className={styles.topnav}>
      {/* Brand logo */}
      <div className={styles.brand} onClick={() => navigate('/')}>
        <span className={styles.bi}>𝐼</span>
        <span className={styles.bt}>nfotograf</span>
      </div>

      {/* Search bar */}
      <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
        <div className={styles.searchBar}>
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.searchIcon}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Right-side actions */}
      <nav className={styles.actions}>
        {/* + New Post */}
        <button className={styles.newPostBtn} onClick={onNewPost}>
          + New Post
        </button>

        {/* Fediverse */}
        <button
          className={`${styles.navBtn} ${isFediverse ? styles.active : ''}`}
          onClick={() => navigate('/fediverse')}
          aria-label="Fediverse"
        >
          <FediverseIcon size={22} />
        </button>

        {/* Home */}
        <button
          className={`${styles.navBtn} ${isHome ? styles.active : ''}`}
          onClick={() => navigate('/')}
          aria-label="Home"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        {/* DMs */}
        <button
          className={`${styles.navBtn} ${isMessages ? styles.active : ''}`}
          onClick={() => navigate('/messages')}
          aria-label="Messages"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadMessages > 0 && (
            <span className={`${styles.badge} ${styles.badgeBlue}`} />
          )}
        </button>

        {/* Heart / Activity dropdown */}
        <div className={styles.notifWrapper}>
          <button
            className={`${styles.navBtn} ${showNotifDropdown || isActivity ? styles.active : ''}`}
            onClick={() => setShowNotifDropdown(prev => !prev)}
            aria-label="Activity"
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {unreadNotifications > 0 && (
              <span className={`${styles.badge} ${styles.badgeRed}`} />
            )}
          </button>

          {showNotifDropdown && (
            <>
              <div className={styles.notifBackdrop} onClick={() => setShowNotifDropdown(false)} />
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>Notifications</div>

                {notifLoading && (
                  <div className={styles.notifLoading}>Loading…</div>
                )}

                {!notifLoading && notifItems.length === 0 && (
                  <div className={styles.notifEmpty}>No notifications yet.</div>
                )}

                {!notifLoading && notifItems.map(notif => {
                  const { main, action } = notifText(notif);
                  const thumbUrl = imageUrl(notif.postThumbnailUrl || notif.postImageUrl);

                  return (
                    <div
                      key={notif.id}
                      className={styles.notifItem}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <Avatar src={notif.actorAvatarUrl} username={notif.actorUsername} size="sm" />

                      <div className={styles.notifText}>
                        <b>{main}</b>{action}
                        <div className={styles.notifTime}>{timeAgo(notif.createdAt)}</div>
                      </div>

                      {thumbUrl && notif.postId && (
                        <img src={thumbUrl} alt="" className={styles.notifThumb} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <button
          className={`${styles.navBtn} ${isProfile ? styles.active : ''}`}
          onClick={() => navigate('/profile')}
          aria-label="Profile"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
