import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TopNav.module.css';
import { useAppState } from '../context/AppStateContext';

export function TopNav({ onNewPost }: { onNewPost: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotifications, unreadMessages } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');

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
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
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

        {/* Fediverse dot */}
        <button
          className={`${styles.navBtn} ${isFediverse ? styles.active : ''}`}
          onClick={() => navigate('/fediverse')}
          aria-label="Fediverse"
        >
          <span className={styles.fediDot}>⬡</span>
        </button>

        {/* Home */}
        <button
          className={`${styles.navBtn} ${isHome ? styles.active : ''}`}
          onClick={() => navigate('/')}
          aria-label="Home"
        >
          🏠
        </button>

        {/* DMs */}
        <button
          className={`${styles.navBtn} ${isMessages ? styles.active : ''}`}
          onClick={() => navigate('/messages')}
          aria-label="Messages"
        >
          ✈
          {unreadMessages > 0 && (
            <span className={`${styles.badge} ${styles.badgeBlue}`} />
          )}
        </button>

        {/* Heart / Activity */}
        <button
          className={`${styles.navBtn} ${isActivity ? styles.active : ''}`}
          onClick={() => navigate('/activity')}
          aria-label="Activity"
        >
          ♡
          {unreadNotifications > 0 && (
            <span className={`${styles.badge} ${styles.badgeRed}`} />
          )}
        </button>

        {/* Profile */}
        <button
          className={`${styles.navBtn} ${isProfile ? styles.active : ''}`}
          onClick={() => navigate('/profile')}
          aria-label="Profile"
        >
          👤
        </button>
      </nav>
    </header>
  );
}
