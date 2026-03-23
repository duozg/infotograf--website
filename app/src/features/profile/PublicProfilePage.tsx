import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './PublicProfilePage.module.css';
import { Avatar } from '../../components/Avatar';
import { FediverseIcon } from '../../components/FediverseIcon';
import { api, apiRequest } from '../../api/client';
import { User, Post } from '../../models';
import { imageUrl } from '../../utils/imageUrl';
import { toCount } from '../../utils/textParser';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://noiscut-api-production.up.railway.app/api';

function RssIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
      <circle cx="6.18" cy="17.82" r="2.18" />
      <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
    </svg>
  );
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [fediverseHandle, setFediverseHandle] = useState<string | null>(null);

  const isAuthenticated = !!currentUser;
  const isOwnProfile = currentUser?.username === username;

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(false);
    try {
      const profileData = await api.get<User>(`/users/${username}`);
      setProfile(profileData);
      setIsFollowing(profileData.isFollowing);

      // Show fediverse handle if federation is enabled for this user
      if (profileData.federationEnabled) {
        setFediverseHandle(`@${profileData.username}@infotograf.com`);
      }

      const { items: postItems, nextCursor } = await api.getPaginated<Post>(`/posts/user/${profileData.id}`);
      setPosts(postItems);
      setPostsCursor(nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = useCallback(async () => {
    if (!profile || !isAuthenticated) return;
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
  }, [profile, isFollowing, isAuthenticated]);

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

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.loadingState}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.errorState}>
            <h2>User not found</h2>
            <p>The user @{username} doesn't exist or their profile is unavailable.</p>
            {!isAuthenticated && (
              <Link to="/login" className={styles.loginLink}>Log in to Infotograf</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* ── Profile header ── */}
        <header className={styles.profileHeader}>
          <div className={styles.avatarSection}>
            <Avatar src={profile.avatarUrl} username={profile.username} size="xxl" />
          </div>

          <div className={styles.profileInfo}>
            {/* Username row */}
            <div className={styles.usernameRow}>
              <h1 className={styles.username}>{profile.username}</h1>
              <a
                href={`${API_BASE}/users/${profile.username}/rss`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.rssLink}
                aria-label="RSS feed"
                title="RSS feed"
              >
                <RssIcon />
              </a>
            </div>

            {/* Action buttons */}
            <div className={styles.actionRow}>
              {isAuthenticated && !isOwnProfile ? (
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
                </>
              ) : isAuthenticated && isOwnProfile ? (
                <button
                  className={styles.editBtn}
                  onClick={() => navigate('/profile')}
                >
                  View full profile
                </button>
              ) : (
                <Link to="/login" className={styles.loginPrompt}>
                  Log in to interact
                </Link>
              )}
            </div>

            {/* Stats row */}
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{toCount(profile.postCount).toLocaleString()}</span>
                <span className={styles.statLabel}>posts</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{toCount(profile.followerCount).toLocaleString()}</span>
                <span className={styles.statLabel}>followers</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{toCount(profile.followingCount).toLocaleString()}</span>
                <span className={styles.statLabel}>following</span>
              </div>
            </div>

            {/* Bio */}
            <div className={styles.bioSection}>
              {profile.displayName && (
                <div className={styles.displayName}>{profile.displayName}</div>
              )}
              {fediverseHandle && (
                <div className={styles.fediverseHandle}>
                  <FediverseIcon size={10} />
                  {fediverseHandle}
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

        {/* ── Post grid ── */}
        {profile.isPrivate && !isFollowing && !isOwnProfile ? (
          <div className={styles.privateNotice}>
            <h3>This account is private</h3>
            <p>Follow {profile.username} to see their photos.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyPosts}>No posts yet.</div>
        ) : (
          <>
            <div className={styles.gridDivider} />
            <div className={styles.grid}>
              {posts.map(post => {
                const images = post.imageUrls && post.imageUrls.length > 0
                  ? post.imageUrls
                  : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
                const thumb = imageUrl(images[0]?.thumbnailUrl || images[0]?.url || images[0]?.imageUrl);
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
            </div>
            {postsCursor && (
              <div className={styles.loadMore} onClick={handleLoadMorePosts}>
                Load more
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
