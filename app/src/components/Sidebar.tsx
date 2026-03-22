import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { Avatar } from './Avatar';
import { useAuth } from '../context/AuthContext';
import { FediverseIcon } from './FediverseIcon';

interface NavItem {
  icon: (active: boolean) => React.ReactNode;
  label: string;
  path: string;
}

function SvgIcon({
  active,
  children,
  color,
}: {
  active: boolean;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: color ?? 'var(--t1)' }}
    >
      {children}
    </svg>
  );
}

const NAV_ITEMS: (NavItem | 'divider')[] = [
  {
    icon: (active) => (
      <SvgIcon active={active}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </SvgIcon>
    ),
    label: 'Feed',
    path: '/',
  },
  {
    icon: (active) => (
      <SvgIcon active={active}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </SvgIcon>
    ),
    label: 'Explore',
    path: '/explore',
  },
  {
    icon: (active) => (
      <SvgIcon active={active}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </SvgIcon>
    ),
    label: 'Direct Messages',
    path: '/messages',
  },
  {
    icon: (active) => (
      <SvgIcon active={active}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </SvgIcon>
    ),
    label: 'Activity',
    path: '/activity',
  },
  'divider',
  {
    icon: () => <FediverseIcon size={20} />,
    label: 'Federation',
    path: '/fediverse',
  },
  {
    icon: (active) => (
      <SvgIcon active={active} color="#f5a623">
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
      </SvgIcon>
    ),
    label: 'RSS Feeds',
    path: '/rss',
  },
  'divider',
  {
    icon: (active) => (
      <SvgIcon active={active}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </SvgIcon>
    ),
    label: 'Profile',
    path: '/profile',
  },
  {
    icon: (active) => (
      <SvgIcon active={active}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </SvgIcon>
    ),
    label: 'Settings',
    path: '/settings',
  },
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
        <div
          className={styles.profileCard}
          onClick={() => navigate('/profile')}
        >
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
              <span className={styles.navIcon}>
                {item.icon(active)}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
