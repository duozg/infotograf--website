import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HeaderBar.module.css';
import { useAppState } from '../context/AppStateContext';

interface HeaderBarProps {
  showLogo?: boolean;
  title?: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  showMessagesBtn?: boolean;
  onBack?: () => void;
}

export function HeaderBar({
  showLogo,
  title,
  leftAction,
  rightActions,
  showMessagesBtn,
  onBack,
}: HeaderBarProps) {
  const navigate = useNavigate();
  const { unreadMessages } = useAppState();

  return (
    <header className={styles.header}>
      <div className={styles.leftSlot}>
        {onBack ? (
          <button className={styles.backBtn} onClick={onBack}>
            ‹ Back
          </button>
        ) : leftAction || null}
      </div>

      {showLogo ? (
        <div className={styles.logo} style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/')}>
          <img src="/images/brand-i-hero.png" alt="" className={styles.logoI} />
          nfotograf
        </div>
      ) : (
        <div className={styles.title}>{title}</div>
      )}

      <div className={styles.rightSlot}>
        {rightActions}
        {showMessagesBtn && (
          <div className={styles.badgeWrapper}>
            <button
              className={styles.iconBtn}
              onClick={() => navigate('/?inbox=1')}
              aria-label="Messages"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            {unreadMessages > 0 && (
              <span className={styles.badge}>{unreadMessages > 9 ? '9+' : unreadMessages}</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
