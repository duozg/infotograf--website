import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ProfilePage.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { User, Post } from '../../models';
import { imageUrl } from '../../utils/imageUrl';
import { toCount } from '../../utils/textParser';
import { useAuth } from '../../context/AuthContext';
import { EditProfileModal } from './EditProfileModal';
import { SettingsModal } from './SettingsModal';

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export function ProfilePage() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();

  const isOwnProfile = !routeUsername || routeUsername === currentUser?.username;
  const targetUsername = isOwnProfile ? currentUser?.username : routeUsername;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchProfile = useCallback(async () => {
    if (!targetUsername) return;
    setLoading(true);
    try {
      const profileData = await api.get<User>(`/users/${targetUsername}`);
      setProfile(profileData);
      setIsFollowing(profileData.isFollowing);
      const { items: postItems, nextCursor } = await api.getPaginated<Post>(`/posts/user/${profileData.id}`);
      setPosts(postItems);
      setPostsCursor(nextCursor);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [targetUsername]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = useCallback(async () => {
    if (!profile) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setProfile(p => p ? {
      ...p,
      followerCount: toCount(p.followerCount) + (wasFollowing ? -1 : 1),
      isFollowing: !wasFollowing,
    } : p);
    try {
      if (wasFollowing) await api.delete(`/follows/${profile.id}`);
      else await api.post(`/follows/${profile.id}`);
    } catch {
      setIsFollowing(wasFollowing);
      setProfile(p => p ? {
        ...p,
        followerCount: toCount(p.followerCount) + (wasFollowing ? 1 : -1),
        isFollowing: wasFollowing,
      } : p);
    }
  }, [profile, isFollowing]);

  const handleLoadMorePosts = useCallback(async () => {
    if (!profile || !postsCursor) return;
    try {
      const { items, nextCursor } = await api.getPaginated<Post>(
        `/posts/user/${profile.id}?cursor=${postsCursor}`
      );
      setPosts(prev => [...prev, ...items]);
      setPostsCursor(nextCursor);
    } catch {}
  }, [profile, postsCursor]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {loading ? (
          <div className={styles.loadingState}>Loading…</div>
        ) : profile ? (
          <>
            {/* ── Desktop profile header ── */}
            <header className={styles.profileHeader}>
              <div className={styles.avatarSection}>
                <Avatar src={profile.avatarUrl} username={profile.username} size="xxl" />
              </div>

              <div className={styles.profileInfo}>
                {/* Username row */}
                <div className={styles.usernameRow}>
                  <h2 className={styles.username}>{profile.username}</h2>
                  {isOwnProfile ? (
                    <>
                      <button
                        className={styles.editBtn}
                        onClick={() => setShowEditProfile(true)}
                      >
                        Edit profile
                      </button>
                      <button
                        className={styles.settingsBtn}
                        onClick={() => setShowSettings(true)}
                        aria-label="Settings"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`${styles.followBtn} ${isFollowing ? styles.following : styles.notFollowing}`}
                        onClick={handleFollow}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button
                        className={styles.messageBtn}
                        onClick={() => navigate(`/messages`)}
                      >
                        Message
                      </button>
                    </>
                  )}
                </div>

                {/* Stats row */}
                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{toCount(profile.postCount).toLocaleString()}</span>
                    <span className={styles.statLabel}>posts</span>
                  </div>
                  <div
                    className={styles.statItem}
                    onClick={() => navigate(`/profile/${profile.username}/followers`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={styles.statValue}>{toCount(profile.followerCount).toLocaleString()}</span>
                    <span className={styles.statLabel}>followers</span>
                  </div>
                  <div
                    className={styles.statItem}
                    onClick={() => navigate(`/profile/${profile.username}/following`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={styles.statValue}>{toCount(profile.followingCount).toLocaleString()}</span>
                    <span className={styles.statLabel}>following</span>
                  </div>
                </div>

                {/* Bio */}
                <div className={styles.bioSection}>
                  {profile.displayName && <div className={styles.displayName}>{profile.displayName}</div>}
                  {profile.bio && <div className={styles.bio}>{profile.bio}</div>}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.website}>
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </header>

            {/* ── View toggle ── */}
            <div className={styles.gridToggle}>
              <button
                className={`${styles.gridToggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <GridIcon />
              </button>
              <button
                className={`${styles.gridToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <ListIcon />
              </button>
            </div>

            {/* ── Posts ── */}
            {profile.isPrivate && !isFollowing && !isOwnProfile ? (
              <div className={styles.privateNotice}>
                <h3>This account is private</h3>
                <p>Follow {profile.username} to see their photos.</p>
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyPosts}>
                {isOwnProfile ? 'Share your first photo.' : 'No posts yet.'}
              </div>
            ) : viewMode === 'grid' ? (
              <div className={styles.grid}>
                {posts.map(post => {
                  const images = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
                  const thumb = imageUrl(images[0]?.thumbnailUrl || images[0]?.imageUrl);
                  return (
                    <div
                      key={post.id}
                      className={styles.gridItem}
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      {thumb && <img src={thumb} alt="" loading="lazy" />}
                    </div>
                  );
                })}
                {postsCursor && (
                  <div
                    style={{ gridColumn: '1/-1', padding: '16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}
                    onClick={handleLoadMorePosts}
                  >
                    Load more
                  </div>
                )}
              </div>
            ) : (
              <div>
                {posts.map(post => {
                  const images = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [{ imageUrl: post.imageUrl }];
                  const thumb = imageUrl(images[0]?.imageUrl);
                  return (
                    <div
                      key={post.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--divider-card)',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      {thumb && (
                        <img
                          src={thumb}
                          alt=""
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {post.caption || 'Photo'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className={styles.loadingState}>User not found.</div>
        )}
      </div>

      {showEditProfile && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSave={updatedProfile => {
            setProfile(updatedProfile);
            updateUser(updatedProfile);
            setShowEditProfile(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
