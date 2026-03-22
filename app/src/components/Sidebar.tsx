import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { Avatar } from './Avatar';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  colorClass?: string;
}

const NAV_ITEMS: (NavItem | 'divider')[] = [
  { icon: '🏠', label: 'Feed', path: '/' },
  { icon: '🔍', label: 'Explore', path: '/explore' },
  { icon: '✈', label: 'Direct Messages', path: '/messages' },
  { icon: '♡', label: 'Activity', path: '/activity' },
  'divider',
  { icon: '⬡', label: 'Federation', path: '/fediverse', colorClass: styles.iconPurple },
  { icon: '◉', label: 'RSS Feeds', path: '/rss', colorClass: styles.iconOrange },
  'divider',
  { icon: '👤', label: 'Profile', path: '/profile' },
  { icon: '⚙', label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Mini profile card */}
      {user && (
        <div className={styles.profileCard} onClick={() => navigate('/profile')}>
          <Avatar src={user.avatarUrl} username={user.username} size="md" />
          <div className={styles.profileInfo}>
            <span className={styles.profileUsername}>{user.username}</span>
            <span className={styles.profileHandle}>@{user.username}@infotograf.com</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item, i) => {
          if (item === 'divider') {
            return <div key={`div-${i}`} className={styles.divider} />;
          }

          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className={`${styles.navIcon} ${item.colorClass || ''}`}>
                {item.icon}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
