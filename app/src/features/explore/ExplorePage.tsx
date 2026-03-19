import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './ExplorePage.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { Post, User, HashtagSuggestion } from '../../models';
import { imageUrl } from '../../utils/imageUrl';

type SearchTab = 'posts' | 'users' | 'tags';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tab, setTab] = useState<SearchTab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<HashtagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchExplore = useCallback(async (q: string) => {
    setLoading(true);
    try {
      if (!q.trim()) {
        const { items } = await api.getPaginated<Post>('/explore');
        setPosts(items);
      } else {
        const [usersRes, tagsRes] = await Promise.allSettled([
          api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
          api.get<HashtagSuggestion[]>(`/explore/hashtags/search?q=${encodeURIComponent(q)}`),
        ]);
        setPosts([]);
        if (usersRes.status === 'fulfilled') setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
        else setUsers([]);
        if (tagsRes.status === 'fulfilled') setTags(Array.isArray(tagsRes.value) ? tagsRes.value : []);
        else setTags([]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchExplore(query);
      if (query) setSearchParams({ q: query });
      else setSearchParams({});
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchExplore, setSearchParams]);

  const isSearching = query.trim().length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Search bar */}
        <div className={styles.searchWrap}>
          <div className={styles.searchBar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search users, tags, photos…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs (when searching) */}
        {isSearching && (
          <div className={styles.tabs}>
            {(['posts', 'users', 'tags'] as SearchTab[]).map(t => (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.active : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}

        {loading && <div className={styles.loading}>Searching…</div>}

        {!loading && (
          <>
            {(!isSearching || tab === 'posts') && (
              <div className={styles.grid}>
                {posts.map(post => {
                  const images = post.imageUrls && post.imageUrls.length > 0
                    ? post.imageUrls
                    : [{ imageUrl: post.imageUrl, thumbnailUrl: post.thumbnailUrl }];
                  const thumb = imageUrl(images[0]?.thumbnailUrl || images[0]?.imageUrl);
                  return (
                    <div
                      key={post.id}
                      className={styles.gridItem}
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      {thumb && <img src={thumb} alt="" loading="lazy" />}
                      {images.length > 1 && (
                        <div className={styles.multipleIndicator}>
                          <svg viewBox="0 0 24 24" fill="white" width={18} height={18}>
                            <rect x="2" y="2" width="15" height="15" rx="2" fill="none" stroke="white" strokeWidth="2"/>
                            <rect x="7" y="7" width="15" height="15" rx="2" fill="rgba(0,0,0,0.5)" stroke="white" strokeWidth="2"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isSearching && tab === 'users' && (
              <div className={styles.userList}>
                {users.length === 0 && <div className={styles.emptyState}>No users found</div>}
                {users.map(user => (
                  <div
                    key={user.id}
                    className={styles.userItem}
                    onClick={() => navigate(`/profile/${user.username}`)}
                  >
                    <Avatar src={user.avatarUrl} username={user.username} size="lg" />
                    <div className={styles.userInfo}>
                      <div className={styles.userUsername}>{user.username}</div>
                      {user.displayName && <div className={styles.userDisplayName}>{user.displayName}</div>}
                      {user.bio && <div className={styles.userBio}>{user.bio}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isSearching && tab === 'tags' && (
              <div>
                {tags.length === 0 && <div className={styles.emptyState}>No hashtags found</div>}
                {tags.map(tag => (
                  <div
                    key={tag.name}
                    className={styles.hashtagItem}
                    onClick={() => {
                      setQuery(tag.name);
                      setTab('posts');
                    }}
                  >
                    <div className={styles.hashtagIcon}>#</div>
                    <div>
                      <div className={styles.hashtagName}>#{tag.name}</div>
                      <div className={styles.hashtagCount}>{tag.postCount.toLocaleString()} posts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
