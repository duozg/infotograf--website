import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TabBar.module.css';
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ActivityIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

interface TabBarProps {
  onCreatePost?: () => void;
}

export function TabBar({ onCreatePost }: TabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadNotifications } = useAppState();

  const path = location.pathname;
  const isHome = path === '/app/' || path === '/app';
  const isExplore = path.startsWith('/app/explore');
  const isNotifications = path.startsWith('/app/notifications');
  const isProfile = path.startsWith('/app/profile') || path === '/app/profile';

  return (
    <nav className={styles.tabBar}>
      <button
        className={`${styles.tab} ${isHome ? styles.active : ''}`}
        onClick={() => navigate('/app/')}
        aria-label="Home"
      >
        <HomeIcon active={isHome} />
      </button>

      <button
        className={`${styles.tab} ${isExplore ? styles.active : ''}`}
        onClick={() => navigate('/app/explore')}
        aria-label="Explore"
      >
        <ExploreIcon active={isExplore} />
      </button>

      <button
        className={styles.tab}
        onClick={onCreatePost}
        aria-label="Create post"
      >
        <CreateIcon />
      </button>

      <button
        className={`${styles.tab} ${isNotifications ? styles.active : ''}`}
        onClick={() => navigate('/app/notifications')}
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <ActivityIcon active={isNotifications} />
        {unreadNotifications > 0 && (
          <span className={styles.badge}>
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      <button
        className={`${styles.tab} ${isProfile ? styles.active : ''}`}
        onClick={() => navigate('/app/profile')}
        aria-label="Profile"
      >
        <ProfileIcon active={isProfile} />
      </button>
    </nav>
  );
}
