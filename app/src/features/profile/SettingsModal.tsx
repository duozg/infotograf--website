import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SettingsModal.module.css';
import { Avatar } from '../../components/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { User } from '../../models';

interface SettingsModalProps {
  onClose: () => void;
}

type ThemeMode = 'dark' | 'light' | 'system';


export function SettingsModal({ onClose }: SettingsModalProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [savingPrivate, setSavingPrivate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<User[]>('/moderation/blocks').then(res => {
      setBlockedUsers(Array.isArray(res) ? res : []);
    }).catch(() => {});
  }, []);

  const handlePrivateToggle = useCallback(async () => {
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    setSavingPrivate(true);
    try {
      await api.patch('/users/me', { isPrivate: newVal });
      updateUser({ isPrivate: newVal });
    } catch {
      setIsPrivate(!newVal);
    } finally {
      setSavingPrivate(false);
    }
  }, [isPrivate, updateUser]);

  const handleUnblock = useCallback(async (userId: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    try {
      await api.delete(`/moderation/blocks/${userId}`);
    } catch {
      // Re-add on error
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      logout();
      onClose();
      navigate('/login', { replace: true });
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [logout, onClose, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  }, [logout, onClose, navigate]);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <span className={styles.title}>Settings</span>
          <div style={{ width: 30 }} />
        </div>

        <div className={styles.content}>
          {/* Account */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Account</div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Private Account</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={handlePrivateToggle}
                  disabled={savingPrivate}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          </div>

          {/* Appearance */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Appearance</div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Theme</span>
              <div className={styles.themeOptions}>
                {(['dark', 'light', 'system'] as ThemeMode[]).map(t => (
                  <button
                    key={t}
                    className={`${styles.themeOption} ${theme === t ? styles.selected : ''}`}
                    onClick={() => setTheme(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Blocked Users */}
          {blockedUsers.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Blocked ({blockedUsers.length})</div>
              <div className={styles.blockedList}>
                {blockedUsers.map(u => (
                  <div key={u.id} className={styles.blockedUser}>
                    <Avatar src={u.avatarUrl} username={u.username} size="md" />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{u.username}</span>
                    <button
                      className={styles.unblockBtn}
                      onClick={() => handleUnblock(u.id)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>About</div>
            <div className={styles.row} style={{ cursor: 'pointer' }} onClick={() => window.open('/privacy', '_blank')}>
              <span className={styles.rowLabel}>Privacy Policy</span>
              <span className={styles.rowValue}>›</span>
            </div>
            <div className={styles.row} style={{ cursor: 'pointer' }} onClick={() => window.open('/terms', '_blank')}>
              <span className={styles.rowLabel}>Terms of Service</span>
              <span className={styles.rowValue}>›</span>
            </div>
            <div className={styles.row} style={{ cursor: 'pointer' }} onClick={() => window.open('/support', '_blank')}>
              <span className={styles.rowLabel}>Support</span>
              <span className={styles.rowValue}>›</span>
            </div>
          </div>

          {/* Logout */}
          <div className={styles.section}>
            <div
              className={styles.dangerRow}
              onClick={handleLogout}
            >
              <span className={styles.dangerLabel}>Log Out{user ? ` @${user.username}` : ''}</span>
            </div>
            {!showDeleteConfirm ? (
              <div
                className={styles.dangerRow}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <span className={styles.dangerLabel}>Delete Account</span>
              </div>
            ) : (
              <div className={styles.row} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  Are you sure? This cannot be undone.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={styles.unblockBtn}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.unblockBtn}
                    style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
