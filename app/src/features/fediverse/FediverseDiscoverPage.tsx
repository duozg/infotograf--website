import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './FediverseDiscoverPage.module.css';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import { FediverseIcon } from '../../components/FediverseIcon';
import { FediverseStats, RemoteActorSummary, DeliverySummary } from '../../models';
import { toCount } from '../../utils/textParser';
import { FederationSettingsModal } from './FederationSettingsModal';
import { RemoteActorModal } from './RemoteActorModal';

interface SearchResult {
  actor?: RemoteActorSummary;
  error?: string;
}

export function FediverseDiscoverPage() {
  const { user } = useAuth();

  // ── Stats ──
  const [stats, setStats] = useState<FediverseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Suggested ──
  const [suggested, setSuggested] = useState<RemoteActorSummary[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);

  // ── Follow states (keyed by actor id) ──
  const [followStates, setFollowStates] = useState<
    Record<string, { following: boolean; pending: boolean }>
  >({});

  // ── Handle copy ──
  const [copied, setCopied] = useState(false);

  // ── Modals ──
  const [showSettings, setShowSettings] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

  // ── Fetch stats ──
  useEffect(() => {
    setStatsLoading(true);
    api
      .get<FediverseStats>('/federation/stats')
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Fetch suggested ──
  useEffect(() => {
    setSuggestedLoading(true);
    api
      .get<RemoteActorSummary[]>('/federation/suggested')
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setSuggested(items);
        const states: Record<string, { following: boolean; pending: boolean }> = {};
        items.forEach((a) => {
          states[a.id] = {
            following: a.isFollowing ?? false,
            pending: a.followPending ?? false,
          };
        });
        setFollowStates((prev) => ({ ...prev, ...states }));
      })
      .catch(() => {})
      .finally(() => setSuggestedLoading(false));
  }, []);

  // ── Search with debounce ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (!q.includes('@') || q.length <= 3) {
      setSearchResult(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      api
        .get<RemoteActorSummary>(`/federation/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
          setSearchResult({ actor: data });
          if (data?.id) {
            setFollowStates((prev) => ({
              ...prev,
              [data.id]: {
                following: data.isFollowing ?? false,
                pending: data.followPending ?? false,
              },
            }));
          }
        })
        .catch(() => {
          setSearchResult({ error: 'User not found on the Fediverse.' });
        })
        .finally(() => setSearchLoading(false));
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ── Follow / unfollow ──
  const handleFollow = useCallback(
    async (actorId: string) => {
      const current = followStates[actorId];
      if (!current) return;

      if (current.following) {
        // Optimistic unfollow
        setFollowStates((prev) => ({
          ...prev,
          [actorId]: { following: false, pending: false },
        }));
        try {
          await api.delete(`/follows/remote/${actorId}`);
        } catch {
          setFollowStates((prev) => ({
            ...prev,
            [actorId]: { following: true, pending: false },
          }));
        }
      } else {
        // Optimistic follow (pending since remote)
        setFollowStates((prev) => ({
          ...prev,
          [actorId]: { following: false, pending: true },
        }));
        try {
          await api.post(`/follows/remote/${actorId}`);
          setFollowStates((prev) => ({
            ...prev,
            [actorId]: { following: true, pending: false },
          }));
        } catch {
          setFollowStates((prev) => ({
            ...prev,
            [actorId]: { following: false, pending: false },
          }));
        }
      }
    },
    [followStates],
  );

  // ── Copy handle ──
  const handleCopy = useCallback(() => {
    if (!user) return;
    const handle = `@${user.username}@infotograf.com`;
    navigator.clipboard.writeText(handle).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [user]);

  // ── Helpers ──
  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const followBtnClass = (actorId: string): string => {
    const state = followStates[actorId];
    if (!state) return styles.followBtn;
    if (state.following) return `${styles.followBtn} ${styles.following}`;
    if (state.pending) return `${styles.followBtn} ${styles.pending}`;
    return styles.followBtn;
  };

  const followBtnLabel = (actorId: string): string => {
    const state = followStates[actorId];
    if (!state) return 'Follow';
    if (state.following) return 'Following';
    if (state.pending) return 'Requested';
    return 'Follow';
  };

  const instances = stats?.instances ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <FediverseIcon size={22} />
          <span className={styles.pageTitle}>Fediverse</span>
          <button
            className={styles.settingsBtn}
            onClick={() => setShowSettings(true)}
            aria-label="Federation settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={20} height={20}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* ── Stats Banner ── */}
        {statsLoading ? (
          <div className={styles.loading}>Loading stats...</div>
        ) : stats ? (
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>
                {formatNumber(toCount(stats.remoteFollowers))}
              </span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>
                {formatNumber(toCount(stats.remoteLikes))}
              </span>
              <span className={styles.statLabel}>Likes</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>
                {formatNumber(toCount(stats.remoteBoosts))}
              </span>
              <span className={styles.statLabel}>Boosts</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>
                {formatNumber(toCount(stats.connectedInstances))}
              </span>
              <span className={styles.statLabel}>Instances</span>
            </div>
          </div>
        ) : null}

        {/* ── Search Bar ── */}
        <div className={styles.sectionHeader}>Search</div>
        <div className={styles.searchWrap}>
          <div className={styles.searchBar}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={styles.searchIcon}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="@user@instance.social"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {searchLoading && (
          <div className={styles.searchLoading}>Looking up on the Fediverse...</div>
        )}

        {!searchLoading && searchResult && (
          <div className={styles.searchResult}>
            {searchResult.actor ? (
              <div className={styles.userRow}>
                <div className={styles.userRowClickable} onClick={() => setSelectedActorId(searchResult.actor!.id)}>
                  <Avatar
                    src={searchResult.actor.avatarUrl}
                    username={searchResult.actor.username}
                    size="lg"
                    isRemote
                  />
                  <div className={styles.userInfo}>
                    <div className={styles.userDisplayName}>
                      {searchResult.actor.displayName || searchResult.actor.username}
                    </div>
                    <div className={styles.userHandle}>
                      @{searchResult.actor.username}@{searchResult.actor.domain}
                    </div>
                    {searchResult.actor.bio && (
                      <div className={styles.userBio}>{searchResult.actor.bio}</div>
                    )}
                  </div>
                </div>
                <button
                  className={followBtnClass(searchResult.actor.id)}
                  onClick={() => handleFollow(searchResult.actor!.id)}
                >
                  {followBtnLabel(searchResult.actor.id)}
                </button>
              </div>
            ) : searchResult.error ? (
              <div className={styles.emptyState}>{searchResult.error}</div>
            ) : null}
          </div>
        )}

        {/* ── Suggested People ── */}
        <div className={styles.sectionHeader}>Suggested People</div>
        {suggestedLoading ? (
          <div className={styles.loading}>Loading suggestions...</div>
        ) : suggested.length === 0 ? (
          <div className={styles.emptyState}>No suggestions yet.</div>
        ) : (
          <div className={styles.suggestedList}>
            {suggested.map((actor) => (
              <div key={actor.id} className={styles.userRow}>
                <div className={styles.userRowClickable} onClick={() => setSelectedActorId(actor.id)}>
                  <Avatar
                    src={actor.avatarUrl}
                    username={actor.username}
                    size="lg"
                    isRemote
                  />
                  <div className={styles.userInfo}>
                    <div className={styles.userDisplayName}>
                      {actor.displayName || actor.username}
                    </div>
                    <div className={styles.userHandle}>
                      @{actor.username}@{actor.domain}
                    </div>
                    {actor.bio && <div className={styles.userBio}>{actor.bio}</div>}
                  </div>
                </div>
                <button
                  className={followBtnClass(actor.id)}
                  onClick={() => handleFollow(actor.id)}
                >
                  {followBtnLabel(actor.id)}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Connected Instances ── */}
        {instances.length > 0 && (
          <>
            <div className={styles.sectionHeader}>Connected Instances</div>
            <div className={styles.instancesScroll}>
              {instances.map((inst) => (
                <div key={inst.domain} className={styles.instancePill}>
                  <span className={styles.instanceDomain}>{inst.domain}</span>
                  <span className={styles.instanceCount}>
                    {toCount(inst.followerCount)} follower
                    {toCount(inst.followerCount) !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Handle Copy Card ── */}
        {user && (
          <div className={styles.handleCard}>
            <FediverseIcon size={28} />
            <div className={styles.handleInfo}>
              <div className={styles.handleLabel}>Your Fediverse Handle</div>
              <div className={styles.handleText}>
                @{user.username}@infotograf.com
              </div>
            </div>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {showSettings && (
        <FederationSettingsModal onClose={() => setShowSettings(false)} />
      )}

      {selectedActorId && (
        <RemoteActorModal
          remoteActorId={selectedActorId}
          onClose={() => setSelectedActorId(null)}
        />
      )}
    </div>
  );
}
