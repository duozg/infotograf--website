import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './EditProfileModal.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { User } from '../../models';

interface EditProfileModalProps {
  profile: User;
  onClose: () => void;
  onSave: (updated: User) => void;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  const checkUsername = useCallback(async (uname: string) => {
    if (uname === profile.username || !uname.trim()) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    try {
      await api.get(`/users/check-username/${encodeURIComponent(uname)}`);
      setUsernameStatus('available');
    } catch {
      setUsernameStatus('taken');
    }
  }, [profile.username]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkUsername(username), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, checkUsername]);

  const handleSave = useCallback(async () => {
    if (usernameStatus === 'taken') return;
    setSaving(true);
    setError('');
    try {
      let updatedProfile: User = profile;

      // 1. Update profile fields (displayName, bio, website) via JSON PATCH
      const profileChanges: Record<string, string> = {};
      if (displayName !== profile.displayName) profileChanges.displayName = displayName;
      if (bio !== profile.bio) profileChanges.bio = bio;
      if (website !== profile.website) profileChanges.website = website;
      if (Object.keys(profileChanges).length > 0) {
        updatedProfile = await api.patch<User>('/users/me', profileChanges);
      }

      // 2. Upload avatar separately with field name "file"
      if (avatarFile) {
        const form = new FormData();
        form.append('file', avatarFile);
        updatedProfile = await api.upload<User>('/users/me/avatar', form);
      }

      // 3. Change username separately
      if (username !== profile.username) {
        updatedProfile = await api.patch<User>('/users/me/username', { username });
      }

      onSave(updatedProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [displayName, username, bio, website, avatarFile, profile, usernameStatus, onSave]);

  const canSave = !saving && usernameStatus !== 'taken' && usernameStatus !== 'checking';

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <span className={styles.title}>Edit Profile</span>
          <button className={styles.doneBtn} onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>

        <div className={styles.content}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <div className={styles.avatarSection}>
            <Avatar
              src={avatarPreview || profile.avatarUrl}
              username={profile.username}
              size="xxl"
            />
            <button
              className={styles.changePhotoBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Change Profile Photo
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              maxLength={30}
              autoCapitalize="none"
            />
            {profile.usernameChangesLeft !== undefined && (
              <div className={styles.changesLeft}>
                {profile.usernameChangesLeft} username {profile.usernameChangesLeft === 1 ? 'change' : 'changes'} remaining
              </div>
            )}
            {usernameStatus !== 'idle' && (
              <div className={`${styles.usernameStatus} ${styles[usernameStatus]}`}>
                {usernameStatus === 'checking' && 'Checking…'}
                {usernameStatus === 'available' && '✓ Available'}
                {usernameStatus === 'taken' && '✗ Already taken'}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              placeholder="Bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Website</label>
            <input
              className={styles.input}
              type="url"
              placeholder="Website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
