import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './RssPage.module.css';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://noiscut-api-production.up.railway.app/api';

// ── Types ──
interface RssFeed {
  url: string;
  title: string;
  iconUrl?: string;
  website?: string;
}

interface FeedItem {
  feedTitle: string;
  feedUrl: string;
  feedIcon?: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
  read?: boolean;
}

interface FeedlyResult {
  feedId: string;
  title: string;
  description?: string;
  website?: string;
  subscribers?: number;
  iconUrl?: string;
  visualUrl?: string;
}

// ── Persistence ──
function loadFeeds(): RssFeed[] {
  try { return JSON.parse(localStorage.getItem('rss_feeds') || '[]'); } catch { return []; }
}
function saveFeeds(feeds: RssFeed[]) { localStorage.setItem('rss_feeds', JSON.stringify(feeds)); }
function loadReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('rss_read') || '[]')); } catch { return new Set(); }
}
function saveReadIds(ids: Set<string>) { localStorage.setItem('rss_read', JSON.stringify([...ids])); }

// ── Feed search via our Vercel proxy → Feedly ──
async function searchFeeds(query: string): Promise<FeedlyResult[]> {
  try {
    const res = await fetch(`/api/rss/search?q=${encodeURIComponent(query)}&count=12`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []) as FeedlyResult[];
  } catch {
    return [];
  }
}

// ── Fetch feeds via our Vercel proxy ──
async function fetchFeedXml(url: string): Promise<string> {
  const res = await fetch(`/api/rss/fetch?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.text();
}

// ── Parse RSS/Atom ──
function parseRss(xml: string, feedUrl: string, feedIcon?: string): { title: string; items: FeedItem[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const feedTitle = doc.querySelector('channel > title')?.textContent || doc.querySelector('feed > title')?.textContent || feedUrl;
  const items: FeedItem[] = [];

  doc.querySelectorAll('channel > item').forEach(item => {
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const desc = item.querySelector('description')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const enclosure = item.querySelector('enclosure');
    const media = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
    const imageUrl = enclosure?.getAttribute('url') || media?.getAttribute('url') || extractImg(desc) || undefined;
    items.push({ feedTitle, feedUrl, feedIcon, title, link, description: stripHtml(desc), pubDate, imageUrl });
  });

  doc.querySelectorAll('feed > entry').forEach(entry => {
    const title = entry.querySelector('title')?.textContent || '';
    const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
    const link = linkEl?.getAttribute('href') || '';
    const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
    const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
    items.push({ feedTitle, feedUrl, feedIcon, title, link, description: stripHtml(summary), pubDate: published });
  });

  return { title: feedTitle, items };
}

function stripHtml(html: string): string {
  const d = document.createElement('div'); d.innerHTML = html; return d.textContent || '';
}
function extractImg(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i); return m ? m[1] : null;
}
function timeAgoShort(s: string): string {
  if (!s) return '';
  const d = Date.now() - new Date(s).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'now'; if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`; return `${Math.floor(days / 7)}w`;
}
function formatSubscribers(n?: number): string {
  if (!n) return '';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
}
function articleId(item: FeedItem): string { return item.link || `${item.feedUrl}:${item.title}`; }

// ── Icons ──
function RssIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="19" r="2" fill="currentColor" /><path d="M4 11a8 8 0 0 1 8 8" /><path d="M4 4a15 15 0 0 1 15 15" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
export function RssPage() {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<RssFeed[]>(loadFeeds);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FeedlyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  // Selected article
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);

  // ── Search with debounce ──
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchFeeds(q);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // ── Fetch all subscribed feeds ──
  const refreshFeeds = useCallback(async (feedList: RssFeed[]) => {
    if (feedList.length === 0) { setAllItems([]); return; }
    setLoading(true);
    const results = await Promise.allSettled(
      feedList.map(async f => {
        const xml = await fetchFeedXml(f.url);
        return parseRss(xml, f.url, f.iconUrl).items;
      })
    );
    const items: FeedItem[] = [];
    results.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value); });
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setAllItems(items);
    setLoading(false);
  }, []);

  useEffect(() => { refreshFeeds(feeds); }, []); // eslint-disable-line

  // ── Subscribe to a feed ──
  const subscribe = useCallback(async (result: FeedlyResult) => {
    const url = result.feedId.replace(/^feed\//, '');
    if (feeds.some(f => f.url === url)) return;
    const newFeed: RssFeed = {
      url,
      title: result.title,
      iconUrl: result.iconUrl || result.visualUrl,
      website: result.website,
    };
    const updated = [...feeds, newFeed];
    setFeeds(updated);
    saveFeeds(updated);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    // Fetch the new feed's articles
    try {
      const xml = await fetchFeedXml(url);
      const { items } = parseRss(xml, url, newFeed.iconUrl);
      setAllItems(prev => [...prev, ...items].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()));
    } catch { /* feed fetch failed, still subscribed */ }
  }, [feeds]);

  // ── Subscribe by raw URL ──
  const subscribeByUrl = useCallback(async (rawUrl: string) => {
    let url = rawUrl.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    if (feeds.some(f => f.url === url)) return;
    try {
      const xml = await fetchFeedXml(url);
      const { title, items } = parseRss(xml, url);
      if (items.length === 0) return;
      const newFeed: RssFeed = { url, title };
      const updated = [...feeds, newFeed];
      setFeeds(updated);
      saveFeeds(updated);
      setAllItems(prev => [...prev, ...items].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()));
      setSearchQuery('');
      setShowSearch(false);
    } catch { /* invalid feed */ }
  }, [feeds]);

  // ── Unsubscribe ──
  const unsubscribe = (url: string) => {
    const updated = feeds.filter(f => f.url !== url);
    setFeeds(updated);
    saveFeeds(updated);
    setAllItems(prev => prev.filter(i => i.feedUrl !== url));
    if (activeFilter === url) setActiveFilter(null);
  };

  // ── Mark as read ──
  const markRead = (item: FeedItem) => {
    const id = articleId(item);
    setReadIds(prev => { const next = new Set(prev); next.add(id); saveReadIds(next); return next; });
  };

  const markAllRead = () => {
    const ids = new Set(readIds);
    filteredItems.forEach(i => ids.add(articleId(i)));
    setReadIds(ids);
    saveReadIds(ids);
  };

  const isSubscribed = (feedId: string) => {
    const url = feedId.replace(/^feed\//, '');
    return feeds.some(f => f.url === url);
  };

  const filteredItems = activeFilter ? allItems.filter(i => i.feedUrl === activeFilter) : allItems;
  const unreadCount = filteredItems.filter(i => !readIds.has(articleId(i))).length;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* ── Left: Sidebar ── */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Feeds</span>
            <button className={styles.addFeedBtn} onClick={() => setShowSearch(true)} title="Add feed">+</button>
          </div>

          {/* Smart feeds */}
          <button
            className={`${styles.sidebarItem} ${!activeFilter ? styles.sidebarItemActive : ''}`}
            onClick={() => setActiveFilter(null)}
          >
            <span className={styles.sidebarIcon}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </span>
            <span className={styles.sidebarLabel}>All Articles</span>
            {unreadCount > 0 && <span className={styles.sidebarBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {/* Divider */}
          {feeds.length > 0 && <div className={styles.sidebarDivider} />}

          {/* Subscribed feeds */}
          {feeds.map(f => {
            const feedUnread = allItems.filter(i => i.feedUrl === f.url && !readIds.has(articleId(i))).length;
            return (
              <div key={f.url} className={styles.sidebarFeedRow}>
                <button
                  className={`${styles.sidebarItem} ${activeFilter === f.url ? styles.sidebarItemActive : ''}`}
                  onClick={() => setActiveFilter(activeFilter === f.url ? null : f.url)}
                >
                  {f.iconUrl ? (
                    <img className={styles.sidebarFeedIcon} src={f.iconUrl} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className={styles.sidebarIcon}><RssIcon size={14} /></span>
                  )}
                  <span className={styles.sidebarLabel}>{f.title}</span>
                  {feedUnread > 0 && <span className={styles.sidebarBadge}>{feedUnread}</span>}
                </button>
                <button className={styles.sidebarRemove} onClick={() => unsubscribe(f.url)} title="Unsubscribe">×</button>
              </div>
            );
          })}

          {/* Your Infotograf feed */}
          {user && (
            <>
              <div className={styles.sidebarDivider} />
              <div className={styles.sidebarFooter}>
                <div className={styles.sidebarFooterLabel}>Your feed URL</div>
                <div
                  className={styles.sidebarFooterUrl}
                  onClick={() => navigator.clipboard.writeText(`${API_BASE}/users/${user.username}/rss`)}
                  title="Click to copy"
                >
                  …/{user.username}/rss
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Article list + reader ── */}
        <div className={styles.main}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <span className={styles.toolbarTitle}>
              {activeFilter ? feeds.find(f => f.url === activeFilter)?.title || 'Feed' : 'All Articles'}
            </span>
            <div className={styles.toolbarActions}>
              {unreadCount > 0 && (
                <button className={styles.markReadBtn} onClick={markAllRead}>Mark all read</button>
              )}
              <button className={styles.refreshBtn} onClick={() => refreshFeeds(feeds)} title="Refresh">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {loading && feeds.length > 0 && <div className={styles.empty}>Loading feeds…</div>}

          {!loading && feeds.length === 0 && !showSearch && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><RssIcon size={48} /></div>
              <div className={styles.emptyTitle}>Your RSS reader</div>
              <p className={styles.emptyDesc}>
                Search for news sources, blogs, and websites to subscribe to their RSS feeds. All your articles in one place, no algorithm.
              </p>
              <button className={styles.emptyBtn} onClick={() => setShowSearch(true)}>Find feeds to follow</button>
              <div className={styles.suggestions}>
                {[
                  { name: 'BBC News', q: 'BBC News' },
                  { name: 'The Verge', q: 'The Verge' },
                  { name: 'TechCrunch', q: 'TechCrunch' },
                  { name: 'Hacker News', q: 'Hacker News' },
                  { name: 'Photography', q: 'photography blog' },
                  { name: 'Design', q: 'design blog' },
                ].map(s => (
                  <button key={s.q} className={styles.suggestPill} onClick={() => { setShowSearch(true); setSearchQuery(s.q); }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Article list */}
          {!loading && filteredItems.length > 0 && !selectedArticle && (
            <div className={styles.articleList}>
              {filteredItems.map((item, i) => {
                const id = articleId(item);
                const isRead = readIds.has(id);
                return (
                  <div
                    key={`${id}-${i}`}
                    className={`${styles.articleRow} ${isRead ? styles.articleRead : ''}`}
                    onClick={() => { markRead(item); setSelectedArticle(item); }}
                  >
                    {!isRead && <div className={styles.unreadDot} />}
                    {item.imageUrl && (
                      <img className={styles.articleThumb} src={item.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <div className={styles.articleMeta}>
                      <div className={styles.articleTitle}>{item.title}</div>
                      <div className={styles.articleDesc}>{item.description?.slice(0, 120)}{(item.description?.length || 0) > 120 ? '…' : ''}</div>
                      <div className={styles.articleSource}>
                        {item.feedIcon && <img className={styles.articleSourceIcon} src={item.feedIcon} alt="" />}
                        <span>{item.feedTitle}</span>
                        <span className={styles.articleTime}>{timeAgoShort(item.pubDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Article reader */}
          {selectedArticle && (
            <div className={styles.reader}>
              <button className={styles.readerBack} onClick={() => setSelectedArticle(null)}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <div className={styles.readerSource}>
                {selectedArticle.feedIcon && <img className={styles.articleSourceIcon} src={selectedArticle.feedIcon} alt="" />}
                {selectedArticle.feedTitle}
              </div>
              <h1 className={styles.readerTitle}>{selectedArticle.title}</h1>
              <div className={styles.readerDate}>
                {selectedArticle.pubDate ? new Date(selectedArticle.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </div>
              {selectedArticle.imageUrl && (
                <img className={styles.readerImage} src={selectedArticle.imageUrl} alt="" />
              )}
              <p className={styles.readerBody}>{selectedArticle.description}</p>
              <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" className={styles.readerLink}>
                Read full article →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Search overlay ── */}
      {showSearch && (
        <div className={styles.searchOverlay} onClick={e => { if (e.target === e.currentTarget) { setShowSearch(false); setSearchQuery(''); setSearchResults([]); } }}>
          <div className={styles.searchModal}>
            <div className={styles.searchHeader}>
              <SearchIcon />
              <input
                className={styles.searchInput}
                placeholder="Search for feeds (e.g. BBC News, photography, tech…)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.startsWith('http')) {
                    subscribeByUrl(searchQuery);
                  }
                }}
                autoFocus
              />
              <button className={styles.searchClose} onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>×</button>
            </div>

            <div className={styles.searchBody}>
              {searching && <div className={styles.searchStatus}>Searching…</div>}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className={styles.searchStatus}>No feeds found for "{searchQuery}"</div>
              )}
              {searchResults.map(r => {
                const subscribed = isSubscribed(r.feedId);
                return (
                  <div key={r.feedId} className={styles.searchResult}>
                    <div className={styles.searchResultIcon}>
                      {r.iconUrl ? <img src={r.iconUrl} alt="" /> : <RssIcon size={20} />}
                    </div>
                    <div className={styles.searchResultInfo}>
                      <div className={styles.searchResultTitle}>{r.title}</div>
                      <div className={styles.searchResultDesc}>
                        {r.description?.slice(0, 100) || r.website || ''}
                        {r.subscribers ? ` · ${formatSubscribers(r.subscribers)} subscribers` : ''}
                      </div>
                    </div>
                    <button
                      className={`${styles.subscribeBtn} ${subscribed ? styles.subscribedBtn : ''}`}
                      onClick={() => { if (!subscribed) subscribe(r); }}
                      disabled={subscribed}
                    >
                      {subscribed ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}

              {!searching && searchQuery.length < 2 && (
                <div className={styles.searchHints}>
                  <div className={styles.searchHintTitle}>Popular feeds</div>
                  {[
                    { name: 'BBC News', q: 'BBC News' },
                    { name: 'The Verge', q: 'The Verge' },
                    { name: 'TechCrunch', q: 'TechCrunch' },
                    { name: 'Hacker News', q: 'Hacker News' },
                    { name: 'Ars Technica', q: 'Ars Technica' },
                    { name: 'The Guardian', q: 'The Guardian' },
                    { name: 'Wired', q: 'Wired' },
                    { name: 'Reuters', q: 'Reuters' },
                  ].map(s => (
                    <button key={s.q} className={styles.searchHintBtn} onClick={() => setSearchQuery(s.q)}>
                      {s.name}
                    </button>
                  ))}
                  <div className={styles.searchHintNote}>You can also paste a direct RSS URL</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
