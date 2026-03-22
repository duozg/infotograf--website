import React, { useState, useEffect, useCallback } from 'react';
import styles from './RssPage.module.css';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://noiscut-api-production.up.railway.app/api';

// ── Types ──
interface RssFeed {
  url: string;
  title: string;
  addedAt: string;
}

interface FeedItem {
  feedTitle: string;
  feedUrl: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
}

// ── LocalStorage persistence ──
function loadFeeds(): RssFeed[] {
  try {
    return JSON.parse(localStorage.getItem('rss_feeds') || '[]');
  } catch { return []; }
}

function saveFeeds(feeds: RssFeed[]) {
  localStorage.setItem('rss_feeds', JSON.stringify(feeds));
}

// ── Parse RSS XML ──
function parseRss(xml: string, feedUrl: string): { title: string; items: FeedItem[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const feedTitle =
    doc.querySelector('channel > title')?.textContent ||
    doc.querySelector('feed > title')?.textContent ||
    feedUrl;

  // RSS 2.0
  const rssItems = doc.querySelectorAll('channel > item');
  // Atom
  const atomEntries = doc.querySelectorAll('feed > entry');

  const items: FeedItem[] = [];

  rssItems.forEach(item => {
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const desc = item.querySelector('description')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const enclosure = item.querySelector('enclosure');
    const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
    const imageUrl = enclosure?.getAttribute('url') ||
      mediaContent?.getAttribute('url') ||
      extractImgFromHtml(desc) || undefined;

    items.push({ feedTitle, feedUrl, title, link, description: stripHtml(desc), pubDate, imageUrl });
  });

  atomEntries.forEach(entry => {
    const title = entry.querySelector('title')?.textContent || '';
    const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
    const link = linkEl?.getAttribute('href') || '';
    const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
    const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';

    items.push({ feedTitle, feedUrl, title, link, description: stripHtml(summary), pubDate: published });
  });

  return { title: feedTitle, items };
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function extractImgFromHtml(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function timeAgoShort(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

// ── CORS proxy for external feeds ──
async function fetchFeedXml(url: string): Promise<string> {
  // Try direct fetch first (works for same-origin and CORS-enabled feeds)
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<channel')) return text;
    }
  } catch { /* CORS blocked, try proxy */ }

  // Fallback: use a public CORS proxy
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`);
  return res.text();
}

// ── Component ──
function RssIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="19" r="2" fill="currentColor" />
      <path d="M4 11a8 8 0 0 1 8 8" />
      <path d="M4 4a15 15 0 0 1 15 15" />
    </svg>
  );
}

export function RssPage() {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<RssFeed[]>(loadFeeds);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Fetch all feeds
  const refreshFeeds = useCallback(async (feedList: RssFeed[]) => {
    if (feedList.length === 0) { setAllItems([]); return; }
    setLoading(true);
    const results = await Promise.allSettled(
      feedList.map(async f => {
        const xml = await fetchFeedXml(f.url);
        const { items } = parseRss(xml, f.url);
        return items;
      })
    );
    const items: FeedItem[] = [];
    results.forEach(r => { if (r.status === 'fulfilled') items.push(...r.value); });
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setAllItems(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshFeeds(feeds);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a feed
  const handleAdd = async () => {
    let url = addUrl.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    if (feeds.some(f => f.url === url)) { setAddError('Already subscribed'); return; }

    setAddLoading(true);
    setAddError('');
    try {
      const xml = await fetchFeedXml(url);
      const { title, items } = parseRss(xml, url);
      if (items.length === 0) { setAddError('No items found in feed'); setAddLoading(false); return; }
      const newFeed: RssFeed = { url, title, addedAt: new Date().toISOString() };
      const updated = [...feeds, newFeed];
      setFeeds(updated);
      saveFeeds(updated);
      setAllItems(prev => [...prev, ...items].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()));
      setAddUrl('');
    } catch {
      setAddError('Could not fetch feed. Check the URL and try again.');
    } finally {
      setAddLoading(false);
    }
  };

  // Remove a feed
  const removeFeed = (url: string) => {
    const updated = feeds.filter(f => f.url !== url);
    setFeeds(updated);
    saveFeeds(updated);
    setAllItems(prev => prev.filter(item => item.feedUrl !== url));
  };

  const filteredItems = activeFilter
    ? allItems.filter(item => item.feedUrl === activeFilter)
    : allItems;

  const myFeedUrl = user ? `${API_BASE}/users/${user.username}/rss` : '';

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}><RssIcon size={24} /></div>
        <div>
          <h1 className={styles.title}>RSS Feeds</h1>
          <p className={styles.subtitle}>Subscribe to news, blogs, and feeds from across the web</p>
        </div>
      </div>

      {/* Add feed */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>Add a feed</div>
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="Paste RSS feed URL (e.g. https://blog.example.com/feed)"
            value={addUrl}
            onChange={e => { setAddUrl(e.target.value); setAddError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <button className={styles.addBtn} onClick={handleAdd} disabled={addLoading}>
            {addLoading ? 'Adding…' : 'Subscribe'}
          </button>
        </div>
        {addError && <div className={styles.addError}>{addError}</div>}
      </div>

      {/* Your subscriptions */}
      {feeds.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>Your subscriptions</div>
          <div className={styles.subList}>
            {feeds.map(f => (
              <div key={f.url} className={styles.subItem}>
                <div
                  className={`${styles.subInfo} ${activeFilter === f.url ? styles.subActive : ''}`}
                  onClick={() => setActiveFilter(activeFilter === f.url ? null : f.url)}
                >
                  <div className={styles.subIcon}><RssIcon size={16} /></div>
                  <span className={styles.subTitle}>{f.title}</span>
                </div>
                <button className={styles.subRemove} onClick={() => removeFeed(f.url)} title="Unsubscribe">×</button>
              </div>
            ))}
            {activeFilter && (
              <button className={styles.clearFilter} onClick={() => setActiveFilter(null)}>
                Show all feeds
              </button>
            )}
          </div>
        </div>
      )}

      {/* Your Infotograf RSS */}
      {user && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>Your Infotograf feed</div>
          <p className={styles.cardDesc}>Others can subscribe to your posts using this URL:</p>
          <div className={styles.addRow}>
            <input className={styles.addInput} value={myFeedUrl} readOnly onClick={e => (e.target as HTMLInputElement).select()} style={{ fontFamily: 'monospace', fontSize: 12 }} />
            <button className={styles.addBtn} onClick={() => navigator.clipboard.writeText(myFeedUrl)}>Copy</button>
          </div>
        </div>
      )}

      {/* Feed items */}
      {loading && <div className={styles.empty}>Loading feeds…</div>}

      {!loading && feeds.length === 0 && (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}><RssIcon size={48} /></div>
          <div className={styles.emptyTitle}>No feeds yet</div>
          <p className={styles.emptyDesc}>
            Add an RSS feed URL above to start reading news, blogs, and updates from across the web — all in one place, no algorithm.
          </p>
          <div className={styles.suggestions}>
            <div className={styles.suggestLabel}>Try these:</div>
            {[
              { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
              { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
              { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
              { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
            ].map(s => (
              <button
                key={s.url}
                className={styles.suggestBtn}
                onClick={() => { setAddUrl(s.url); }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className={styles.feedItems}>
          {filteredItems.map((item, i) => (
            <a
              key={`${item.link}-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.feedItem}
            >
              {item.imageUrl && (
                <img
                  className={styles.feedItemImage}
                  src={item.imageUrl}
                  alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className={styles.feedItemContent}>
                <div className={styles.feedItemSource}>
                  <RssIcon size={12} />
                  <span>{item.feedTitle}</span>
                  <span className={styles.feedItemTime}>{timeAgoShort(item.pubDate)}</span>
                </div>
                <div className={styles.feedItemTitle}>{item.title}</div>
                {item.description && (
                  <div className={styles.feedItemDesc}>
                    {item.description.length > 160 ? item.description.slice(0, 160) + '…' : item.description}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
