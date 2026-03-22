import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TopNav.module.css';
import { useAppState } from '../context/AppStateContext';
import { FediverseIcon } from './FediverseIcon';

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

        {/* Heart / Activity */}
        <button
          className={`${styles.navBtn} ${isActivity ? styles.active : ''}`}
          onClick={() => navigate('/activity')}
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
