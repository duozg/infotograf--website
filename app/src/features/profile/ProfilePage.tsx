import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ProfilePage.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { User, Post, FederationStatus, FediverseStats } from '../../models';
import { imageUrl } from '../../utils/imageUrl';
import { toCount } from '../../utils/textParser';
import { useAuth } from '../../context/AuthContext';
import { EditProfileModal } from './EditProfileModal';
import { SettingsModal } from './SettingsModal';
import { ReportModal } from '../../components/ReportModal';
import { FediverseIcon } from '../../components/FediverseIcon';
import { RemoteActorModal } from '../fediverse/RemoteActorModal';

interface FollowModalProps {
  userId: string;
  kind: 'followers' | 'following';
  onClose: () => void;
}

function FollowModal({ userId, kind, onClose }: FollowModalProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<(User & { remoteDomain?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [remoteActorId, setRemoteActorId] = useState<string | null>(null);

  useEffect(() => {
    const endpoint = kind === 'followers'
      ? `/follows/${userId}/followers`
      : `/follows/${userId}/following`;
    api.getPaginated<User & { remoteDomain?: string }>(endpoint)
      .then(({ items }) => setUsers(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, kind]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, width: 360, maxWidth: '90vw',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--divider-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {kind === 'followers' ? 'Followers' : 'Following'}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1 }}
          >×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</div>
          )}
          {!loading && users.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          )}
          {users.map(u => (
            <div
              key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onClick={() => {
                if (u.remoteDomain) {
                  setRemoteActorId(u.id);
                } else {
                  onClose();
                  navigate(`/profile/${u.username}`);
                }
              }}
            >
              <Avatar src={u.avatarUrl} username={u.username} size="md" isRemote={!!u.remoteDomain} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {u.username}
                  {u.remoteDomain && (
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--purple)', marginLeft: 4 }}>@{u.remoteDomain}</span>
                  )}
                </div>
                {u.displayName && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.displayName}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {remoteActorId && (
        <RemoteActorModal remoteActorId={remoteActorId} onClose={() => setRemoteActorId(null)} />
      )}
    </div>
  );
}

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

function BookmarkTabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'posts' | 'bookmarks'>('posts');
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [bookmarksCursor, setBookmarksCursor] = useState<string | null>(null);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [federationEnabled, setFederationEnabled] = useState(false);
  const [fediverseStats, setFediverseStats] = useState<FediverseStats | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!targetUsername) return;
    setLoading(true);
    try {
      const profileData = await api.get<User>(`/users/${targetUsername}`);
      setProfile(profileData);
      setIsFollowing(profileData.isFollowing);
      setIsBlocked(profileData.isBlocked || false);
      setIsMuted(profileData.isMuted || false);
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

  // Fetch federation status for own profile
  useEffect(() => {
    if (!isOwnProfile) return;
    api.get<FederationStatus>('/federation/status')
      .then(s => setFederationEnabled(s.federationEnabled))
      .catch(() => {});
    api.get<FediverseStats>('/federation/stats')
      .then(s => setFediverseStats(s))
      .catch(() => {});
  }, [isOwnProfile]);

  const handleFollow = useCallback(async () => {
    if (!profile) return;
    const wasFollowing = isFollowing;
    if (wasFollowing && !window.confirm(`Unfollow @${profile.username}?`)) return;
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

  const handleBlock = useCallback(async () => {
    if (!profile) return;
    if (!isBlocked && !window.confirm(`Block @${profile.username}? They won't be able to see your profile or posts.`)) return;
    setShowMoreMenu(false);
    const wasBlocked = isBlocked;
    setIsBlocked(!wasBlocked);
    try {
      if (wasBlocked) await api.delete(`/moderation/blocks/${profile.id}`);
      else await api.post(`/moderation/blocks/${profile.id}`);
    } catch {
      setIsBlocked(wasBlocked);
    }
  }, [profile, isBlocked]);

  const handleMute = useCallback(async () => {
    if (!profile) return;
    setShowMoreMenu(false);
    const wasMuted = isMuted;
    setIsMuted(!wasMuted);
    try {
      if (wasMuted) await api.delete(`/moderation/mutes/${profile.id}`);
      else await api.post(`/moderation/mutes/${profile.id}`);
    } catch {
      setIsMuted(wasMuted);
    }
  }, [profile, isMuted]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const { items, nextCursor } = await api.getPaginated<Post>('/posts/bookmarks');
      setBookmarks(items);
      setBookmarksCursor(nextCursor);
      setBookmarksLoaded(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'bookmarks' && isOwnProfile && !bookmarksLoaded) {
      fetchBookmarks();
    }
  }, [activeTab, isOwnProfile, bookmarksLoaded, fetchBookmarks]);

  const handleLoadMoreBookmarks = useCallback(async () => {
    if (!bookmarksCursor) return;
    try {
      const { items, nextCursor } = await api.getPaginated<Post>(`/posts/bookmarks?cursor=${bookmarksCursor}`);
      setBookmarks(prev => [...prev, ...items]);
      setBookmarksCursor(nextCursor);
    } catch {}
  }, [bookmarksCursor]);

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
                        onClick={() => navigate(`/messages?with=${profile.id}`)}
                      >
                        Message
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          className={styles.moreMenuBtn}
                          onClick={() => setShowMoreMenu(v => !v)}
                          aria-label="More options"
                        >···</button>
                        {showMoreMenu && (
                          <div className={styles.profileMenu}>
                            <button className={styles.profileMenuItem} onClick={handleMute}>
                              {isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                              className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
                              onClick={handleBlock}
                            >
                              {isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
                              onClick={() => { setShowMoreMenu(false); setShowReport(true); }}
                            >
                              Report
                            </button>
                          </div>
                        )}
                      </div>
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
                    onClick={() => setFollowModal('followers')}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={styles.statValue}>{toCount(profile.followerCount).toLocaleString()}</span>
                    <span className={styles.statLabel}>followers</span>
                    {isOwnProfile && federationEnabled && fediverseStats && fediverseStats.remoteFollowers > 0 && (
                      <span className={styles.fediverseStatSub}>+{fediverseStats.remoteFollowers} fediverse</span>
                    )}
                  </div>
                  <div
                    className={styles.statItem}
                    onClick={() => setFollowModal('following')}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={styles.statValue}>{toCount(profile.followingCount).toLocaleString()}</span>
                    <span className={styles.statLabel}>following</span>
                  </div>
                </div>

                {/* Bio */}
                <div className={styles.bioSection}>
                  {profile.displayName && (
                    <div className={styles.displayNameRow}>
                      <span className={styles.displayName}>{profile.displayName}</span>
                      {isOwnProfile && federationEnabled && (
                        <span className={styles.fediverseBadge}>
                          <FediverseIcon size={8} />
                          Fediverse
                        </span>
                      )}
                    </div>
                  )}
                  {isOwnProfile && federationEnabled && currentUser?.username && (
                    <div className={styles.fediverseHandle}>
                      <FediverseIcon size={10} />
                      @{currentUser.username}@infotograf.com
                    </div>
                  )}
                  {profile.bio && <div className={styles.bio}>{profile.bio}</div>}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.website}>
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </header>

            {isBlocked && (
              <div style={{
                margin: '24px 0', padding: '20px', background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)', borderRadius: 8,
                textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14,
              }}>
                You have blocked this user.
              </div>
            )}

            {/* ── View toggle ── */}
            <div className={styles.gridToggle}>
              <button
                className={`${styles.gridToggleBtn} ${activeTab === 'posts' && viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => { setActiveTab('posts'); setViewMode('grid'); }}
                aria-label="Grid view"
              >
                <GridIcon />
              </button>
              <button
                className={`${styles.gridToggleBtn} ${activeTab === 'posts' && viewMode === 'list' ? styles.active : ''}`}
                onClick={() => { setActiveTab('posts'); setViewMode('list'); }}
                aria-label="List view"
              >
                <ListIcon />
              </button>
              {isOwnProfile && (
                <button
                  className={`${styles.gridToggleBtn} ${activeTab === 'bookmarks' ? styles.active : ''}`}
                  onClick={() => setActiveTab('bookmarks')}
                  aria-label="Saved posts"
                >
                  <BookmarkTabIcon />
                </button>
              )}
            </div>

            {/* ── Bookmarks (own profile only) ── */}
            {activeTab === 'bookmarks' && isOwnProfile && (
              bookmarks.length === 0 && bookmarksLoaded ? (
                <div className={styles.emptyPosts}>No saved posts yet.</div>
              ) : (
                <div className={styles.grid}>
                  {bookmarks.map(post => {
                    const imgs = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
                    const thumb = imageUrl(imgs[0]?.thumbnailUrl || imgs[0]?.imageUrl);
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
                  {bookmarksCursor && (
                    <div
                      style={{ gridColumn: '1/-1', padding: '16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}
                      onClick={handleLoadMoreBookmarks}
                    >
                      Load more
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── Posts ── */}
            {activeTab === 'posts' && (profile.isPrivate && !isFollowing && !isOwnProfile ? (
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
                      {images.length > 1 && (
                        <div className={styles.carouselBadge}>
                          <svg viewBox="0 0 24 24" fill="white" width={16} height={16}>
                            <rect x="2" y="2" width="15" height="15" rx="2" fill="none" stroke="white" strokeWidth="2"/>
                            <rect x="7" y="7" width="15" height="15" rx="2" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2"/>
                          </svg>
                        </div>
                      )}
                      <div className={styles.gridOverlay}>
                        <span className={styles.gridLikes}>
                          <svg viewBox="0 0 24 24" fill="white" width={14} height={14}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {toCount(post.likeCount).toLocaleString()}
                        </span>
                        <span className={styles.gridLikes}>
                          <svg viewBox="0 0 24 24" fill="white" width={14} height={14}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {toCount(post.commentCount).toLocaleString()}
                        </span>
                      </div>
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
            ))}
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

      {followModal && profile && (
        <FollowModal
          userId={profile.id}
          kind={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}

      {showReport && profile && (
        <ReportModal
          targetId={profile.id}
          targetType="user"
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
