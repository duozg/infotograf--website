import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './TopNav.module.css';
import { useAppState } from '../context/AppStateContext';
import { useAuth } from '../context/AuthContext';
import { FediverseIcon } from './FediverseIcon';
import { api, parsePaginated } from '../api/client';
import { AppNotification, Conversation, User, HashtagSuggestion, RemoteActorSummary } from '../models';
import { Avatar } from './Avatar';
import { ChatWidget } from './ChatWidget';
import { RemoteActorModal } from '../features/fediverse/RemoteActorModal';
import { timeAgo } from '../utils/timeAgo';
import { imageUrl } from '../utils/imageUrl';

function notifText(n: AppNotification): { main: string; action: string } {
  const count = n.coalescedCount && n.coalescedCount > 1 ? n.coalescedCount : null;
  const actor = n.actorUsername || 'Someone';
  const countStr = count ? ` and ${count - 1} other${count - 1 > 1 ? 's' : ''}` : '';

  switch (n.type) {
    case 'like':
      return { main: `${actor}${countStr}`, action: ' liked your photo.' };
    case 'comment':
      return { main: `${actor}${countStr}`, action: ` commented: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'follow':
      return { main: `${actor}${countStr}`, action: ' started following you.' };
    case 'mention':
      return { main: `${actor}`, action: ` mentioned you in a comment: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'commentReply':
      return { main: `${actor}`, action: ` replied: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'commentLike':
      return { main: `${actor}${countStr}`, action: ' liked your comment.' };
    default:
      return { main: actor, action: ' interacted with you.' };
  }
}

export function TopNav({ onNewPost }: { onNewPost: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadNotifications, unreadMessages, clearNotifications, federationEnabled } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifItems, setNotifItems] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // DM dropdown state
  const [showDmDropdown, setShowDmDropdown] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dmLoading, setDmLoading] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<{ users: User[]; hashtags: HashtagSuggestion[]; fediverse: RemoteActorSummary[] }>({ users: [], hashtags: [], fediverse: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live search — debounce 300ms
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setShowSearchDropdown(false);
      setSearchResults({ users: [], hashtags: [], fediverse: [] });
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setShowSearchDropdown(true);
      try {
        const isFediQuery = q.includes('@');
        const promises: [Promise<unknown>, Promise<unknown>, Promise<unknown>] = [
          api.get<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
          api.get<HashtagSuggestion[]>(`/explore/hashtags/search?q=${encodeURIComponent(q.replace('#', ''))}`),
          isFediQuery ? api.get<RemoteActorSummary | RemoteActorSummary[]>(`/federation/search?q=${encodeURIComponent(q)}`) : Promise.resolve(null),
        ];
        const [usersRes, tagsRes, fediRes] = await Promise.allSettled(promises);
        const users = usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value as User[] : []) : [];
        const hashtags = tagsRes.status === 'fulfilled' ? (Array.isArray(tagsRes.value) ? tagsRes.value as HashtagSuggestion[] : []) : [];
        let fediverse: RemoteActorSummary[] = [];
        if (fediRes.status === 'fulfilled' && fediRes.value) {
          const v = fediRes.value;
          fediverse = Array.isArray(v) ? v : [v as RemoteActorSummary];
        }
        setSearchResults({ users, hashtags, fediverse });
      } catch {
        setSearchResults({ users: [], hashtags: [], fediverse: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Remote actor modal state
  const [remoteActorId, setRemoteActorId] = useState<string | null>(null);

  const handleSearchResultClick = (type: 'user' | 'hashtag', value: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (type === 'user') navigate(`/profile/${value}`);
    else navigate(`/explore?q=%23${value}`);
  };

  // Floating chat state
  const [activeChat, setActiveChat] = useState<{
    conversationId: string;
    otherUser: { username: string; avatarUrl?: string };
  } | null>(null);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const raw = await api.get<unknown>('/notifications');
      const { items } = parsePaginated<AppNotification>(raw);
      setNotifItems(items);
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showNotifDropdown) {
      fetchNotifications();
      const timer = setTimeout(() => {
        api.post('/notifications/read').catch(() => {});
        clearNotifications();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showNotifDropdown, fetchNotifications, clearNotifications]);

  // Fetch DM conversations when dropdown opens
  const fetchConversations = useCallback(async () => {
    setDmLoading(true);
    try {
      const { items } = await api.getPaginated<Conversation>('/conversations');
      setConversations(items);
    } catch {
      // ignore
    } finally {
      setDmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showDmDropdown) {
      fetchConversations();
    }
  }, [showDmDropdown, fetchConversations]);

  const getOtherMember = (conv: Conversation) => {
    if (!user) return conv.members[0];
    return conv.members.find(m => m.id !== user.id) || conv.members[0];
  };

  const handleDmConversationClick = (conv: Conversation) => {
    const other = getOtherMember(conv);
    setShowDmDropdown(false);
    setActiveChat({
      conversationId: conv.id,
      otherUser: { username: other?.username || 'Unknown', avatarUrl: other?.avatarUrl },
    });
  };

  const handleNotifClick = (notif: AppNotification) => {
    setShowNotifDropdown(false);
    if (notif.postId) navigate(`/post/${notif.postId}`);
    else if (notif.remoteDomain && notif.remoteActorId) setRemoteActorId(notif.remoteActorId);
    else if (notif.actorUsername) navigate(`/profile/${notif.actorUsername}`);
  };

  const path = location.pathname;
  const isHome = path === '/';
  const isFediverse = path.startsWith('/fediverse');
  const isMessages = path.startsWith('/messages');
  const isActivity = path.startsWith('/activity');
  const isProfile = path === '/profile' || path.startsWith('/profile/');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
    setSearchQuery('');
  };

  return (
    <header className={styles.topnav}>
      {/* Brand logo */}
      <div className={styles.brand} onClick={() => navigate('/')}>
        <span className={styles.bi}>𝐼</span>
        <span className={styles.bt}>nfotograf</span>
      </div>

      {/* Search bar */}
      <div className={styles.searchWrapper}>
        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <div className={styles.searchBar}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search users, #hashtags, @user@instance..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
            />
            {searchQuery && (
              <button type="button" className={styles.searchClear} onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}>✕</button>
            )}
          </div>
        </form>

        {showSearchDropdown && (
          <>
            <div className={styles.searchBackdrop} onClick={() => setShowSearchDropdown(false)} />
            <div className={styles.searchDropdown}>
              {searchLoading && <div className={styles.searchLoading}>Searching...</div>}
              {!searchLoading && searchResults.users.length === 0 && searchResults.hashtags.length === 0 && searchResults.fediverse.length === 0 && (
                <div className={styles.searchEmpty}>No results for "{searchQuery}"</div>
              )}
              {searchResults.users.length > 0 && (
                <div className={styles.searchSection}>
                  {searchResults.users.map(u => (
                    <div key={u.id} className={styles.searchItem} onClick={() => handleSearchResultClick('user', u.username)}>
                      <Avatar src={u.avatarUrl} username={u.username} size="md" />
                      <div className={styles.searchItemInfo}>
                        <div className={styles.searchItemName}>{u.username}</div>
                        {u.displayName && <div className={styles.searchItemSub}>{u.displayName}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.fediverse.length > 0 && (
                <div className={styles.searchSection}>
                  <div className={styles.searchSectionLabel}>Fediverse</div>
                  {searchResults.fediverse.map(actor => (
                    <div key={actor.id} className={styles.searchItem} onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); if (actor.isLocal) navigate(`/profile/${actor.username}`); else setRemoteActorId(actor.id); }}>
                      <Avatar src={actor.avatarUrl} username={actor.username} size="md" isRemote />
                      <div className={styles.searchItemInfo}>
                        <div className={styles.searchItemName}>{actor.displayName || actor.username}</div>
                        <div className={styles.searchItemSub} style={{ color: 'var(--purple)' }}>@{actor.username}@{actor.domain}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.hashtags.length > 0 && (
                <div className={styles.searchSection}>
                  {searchResults.hashtags.map(tag => (
                    <div key={tag.name} className={styles.searchItem} onClick={() => handleSearchResultClick('hashtag', tag.name)}>
                      <div className={styles.searchHashIcon}>#</div>
                      <div className={styles.searchItemInfo}>
                        <div className={styles.searchItemName}>#{tag.name}</div>
                        <div className={styles.searchItemSub}>{tag.postCount.toLocaleString()} posts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right-side actions */}
      <nav className={styles.actions}>
        {/* + New Post */}
        <button className={styles.newPostBtn} onClick={onNewPost}>
          + New Post
        </button>

        {/* Fediverse (only when enabled) */}
        {federationEnabled && (
          <button
            className={`${styles.navBtn} ${isFediverse ? styles.active : ''}`}
            onClick={() => navigate('/fediverse')}
            aria-label="Fediverse"
          >
            <FediverseIcon size={22} />
          </button>
        )}

        {/* Home */}
        <button
          className={`${styles.navBtn} ${isHome ? styles.active : ''}`}
          onClick={() => navigate('/')}
          aria-label="Home"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        {/* DMs dropdown */}
        <div className={styles.dmWrapper}>
          <button
            className={`${styles.navBtn} ${showDmDropdown || isMessages ? styles.active : ''}`}
            onClick={() => {
              setShowDmDropdown(prev => !prev);
              setShowNotifDropdown(false);
            }}
            aria-label="Messages"
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadMessages > 0 && (
              <span className={`${styles.badge} ${styles.badgeBlue}`} />
            )}
          </button>

          {showDmDropdown && (
            <>
              <div className={styles.dmBackdrop} onClick={() => setShowDmDropdown(false)} />
              <div className={styles.dmDropdown}>
                <div className={styles.dmHeader}>
                  <span className={styles.dmTitle}>Messages</span>
                  <div className={styles.dmHeaderActions}>
                    <button
                      className={styles.dmExpandBtn}
                      onClick={() => { setShowDmDropdown(false); navigate('/messages'); }}
                      aria-label="Open full messages"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </button>
                    <button
                      className={styles.dmCloseBtn}
                      onClick={() => setShowDmDropdown(false)}
                      aria-label="Close"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={styles.dmList}>
                  {dmLoading && (
                    <div className={styles.dmEmpty}>Loading…</div>
                  )}

                  {!dmLoading && conversations.length === 0 && (
                    <div className={styles.dmEmpty}>No conversations yet.</div>
                  )}

                  {!dmLoading && conversations.map(conv => {
                    const other = getOtherMember(conv);
                    const lastMsg = conv.lastMessage;
                    let preview = '';
                    if (lastMsg) {
                      const isMyMessage = lastMsg.senderId === user?.id;
                      const bodyText = lastMsg.body
                        ? (lastMsg.body === '[heart]' ? '\u2764\uFE0F' : lastMsg.body)
                        : (lastMsg.imageUrl ? 'Photo' : lastMsg.audioUrl ? 'Voice message' : '');
                      preview = isMyMessage ? `You: ${bodyText}` : bodyText;
                    }

                    return (
                      <div
                        key={conv.id}
                        className={styles.dmItem}
                        onClick={() => handleDmConversationClick(conv)}
                      >
                        <Avatar src={other?.avatarUrl} username={other?.username} size="lg" />
                        <div className={styles.dmItemInfo}>
                          <div className={styles.dmItemName}>{other?.username || 'Unknown'}</div>
                          <div className={styles.dmItemRow}>
                            {preview && <span className={styles.dmItemPreview}>{preview}</span>}
                            {lastMsg && <span className={styles.dmItemTime}>{timeAgo(lastMsg.createdAt)}</span>}
                          </div>
                        </div>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className={styles.dmUnread} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Heart / Activity dropdown */}
        <div className={styles.notifWrapper}>
          <button
            className={`${styles.navBtn} ${showNotifDropdown || isActivity ? styles.active : ''}`}
            onClick={() => {
              setShowNotifDropdown(prev => !prev);
              setShowDmDropdown(false);
            }}
            aria-label="Activity"
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {unreadNotifications > 0 && (
              <span className={`${styles.badge} ${styles.badgeRed}`} />
            )}
          </button>

          {showNotifDropdown && (
            <>
              <div className={styles.notifBackdrop} onClick={() => setShowNotifDropdown(false)} />
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>Notifications</div>

                {notifLoading && (
                  <div className={styles.notifLoading}>Loading…</div>
                )}

                {!notifLoading && notifItems.length === 0 && (
                  <div className={styles.notifEmpty}>No notifications yet.</div>
                )}

                {!notifLoading && notifItems.map(notif => {
                  const { main, action } = notifText(notif);
                  const thumbUrl = imageUrl(notif.postThumbnailUrl || notif.postImageUrl);

                  return (
                    <div
                      key={notif.id}
                      className={styles.notifItem}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <Avatar src={notif.actorAvatarUrl} username={notif.actorUsername} size="sm" />

                      <div className={styles.notifText}>
                        <b>{main}</b>{action}
                        <div className={styles.notifTime}>{timeAgo(notif.createdAt)}</div>
                      </div>

                      {thumbUrl && notif.postId && (
                        <img src={thumbUrl} alt="" className={styles.notifThumb} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <button
          className={`${styles.navBtn} ${isProfile ? styles.active : ''}`}
          onClick={() => navigate('/profile')}
          aria-label="Profile"
        >
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </nav>

      {/* Floating chat widget */}
      {activeChat && (
        <ChatWidget
          conversationId={activeChat.conversationId}
          otherUser={activeChat.otherUser}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Remote actor modal (fediverse profiles) */}
      {remoteActorId && (
        <RemoteActorModal remoteActorId={remoteActorId} onClose={() => setRemoteActorId(null)} />
      )}
    </header>
  );
}
