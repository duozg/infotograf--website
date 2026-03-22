import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './NavBar.module.css';
import { Avatar } from './Avatar';
import { FediverseIcon } from './FediverseIcon';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ExploreIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function HeartIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function MessagesIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface NavBarProps {
  onCreatePost?: () => void;
}

export function NavBar({ onCreatePost }: NavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadNotifications, unreadMessages } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');

  const path = location.pathname;
  const isHome = path === '/';
  const isExplore = path.startsWith('/explore');
  const isFediverse = path.startsWith('/fediverse');
  const isNotifications = path.startsWith('/notifications');
  const isProfile = path === '/profile' || (path.startsWith('/profile/') && !path.includes('/followers') && !path.includes('/following'));
  const isMessages = path.startsWith('/messages');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
    setSearchQuery('');
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <div className={styles.logo} onClick={() => navigate('/')}>
          Infotograf
        </div>

        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <div className={styles.searchBar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={styles.searchIcon}>
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

        <nav className={styles.icons}>
          <button
            className={`${styles.navBtn} ${isHome ? styles.active : ''}`}
            onClick={() => navigate('/')}
            aria-label="Home"
          >
            <HomeIcon active={isHome} />
          </button>

          <button
            className={`${styles.navBtn} ${isExplore ? styles.active : ''}`}
            onClick={() => navigate('/explore')}
            aria-label="Explore"
          >
            <ExploreIcon active={isExplore} />
          </button>

          <button
            className={styles.navBtn}
            onClick={onCreatePost}
            aria-label="Create post"
          >
            <CreateIcon />
          </button>

          <button
            className={`${styles.navBtn} ${isFediverse ? styles.active : ''}`}
            onClick={() => navigate('/fediverse')}
            aria-label="Fediverse"
          >
            <FediverseIcon size={22} />
          </button>

          <button
            className={`${styles.navBtn} ${isMessages ? styles.active : ''}`}
            onClick={() => navigate('/messages')}
            aria-label="Messages"
          >
            <MessagesIcon active={isMessages} />
            {unreadMessages > 0 && (
              <span className={`${styles.badge} neon-glow-badge`}>{unreadMessages > 9 ? '9+' : unreadMessages}</span>
            )}
          </button>

          <button
            className={`${styles.navBtn} ${isNotifications ? styles.active : ''} ${unreadNotifications > 0 ? 'neon-glow-icon' : ''}`}
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
          >
            <HeartIcon active={isNotifications || unreadNotifications > 0} />
            {unreadNotifications > 0 && (
              <span className={`${styles.badge} neon-glow-badge`}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
            )}
          </button>

          <button
            className={`${styles.navBtn} ${isProfile ? styles.active : ''}`}
            onClick={() => navigate('/profile')}
            aria-label="Profile"
          >
            <Avatar src={user?.avatarUrl} username={user?.username} size="sm" />
          </button>
        </nav>
      </div>
    </header>
  );
}
