import React, { useEffect, useState, RefObject } from 'react';

interface RssFeed {
  url: string;
  title: string;
  iconUrl?: string;
}

interface FeedItem {
  feedTitle: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
}

function loadFeeds(): RssFeed[] {
  try { return JSON.parse(localStorage.getItem('rss_feeds') || '[]'); } catch { return []; }
}

function stripHtml(html: string): string {
  const d = document.createElement('div'); d.innerHTML = html; return d.textContent || '';
}

function extractImg(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i); return m ? m[1] : null;
}

function timeAgo(s: string): string {
  if (!s) return '';
  const d = Date.now() - new Date(s).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(s).toLocaleDateString();
}

async function fetchAndParseFeed(feed: RssFeed): Promise<FeedItem[]> {
  try {
    const res = await fetch(`/api/rss/fetch?url=${encodeURIComponent(feed.url)}`);
    if (!res.ok) return [];
    const xml = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const feedTitle = doc.querySelector('channel > title')?.textContent
      || doc.querySelector('feed > title')?.textContent
      || feed.title;
    const items: FeedItem[] = [];

    // RSS format
    doc.querySelectorAll('channel > item').forEach(item => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const desc = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const enclosure = item.querySelector('enclosure');
      const media = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
      const imageUrl = enclosure?.getAttribute('url') || media?.getAttribute('url') || extractImg(desc) || undefined;
      items.push({ feedTitle, title, link, description: stripHtml(desc), pubDate, imageUrl });
    });

    // Atom format
    doc.querySelectorAll('feed > entry').forEach(entry => {
      const title = entry.querySelector('title')?.textContent || '';
      const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
      const link = linkEl?.getAttribute('href') || '';
      const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
      const published = entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '';
      items.push({ feedTitle, title, link, description: stripHtml(summary), pubDate: published });
    });

    return items;
  } catch {
    return [];
  }
}

interface RssColumnProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function RssColumn({ scrollContainerRef: _scrollContainerRef }: RssColumnProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const feeds = loadFeeds();
    if (feeds.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(feeds.map(f => fetchAndParseFeed(f)))
      .then(results => {
        if (cancelled) return;
        const all = results.flat().sort((a, b) =>
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        );
        setItems(all.slice(0, 50));
      })
      .catch(() => { if (!cancelled) setError('Failed to load feeds'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: 0 }}>
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>Loading feeds…</div>
      )}

      {!loading && error && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--accent-red)', fontSize: 14 }}>{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14, lineHeight: 1.8 }}>
          No RSS feeds yet.<br />
          Add feeds from the <a href="/rss" style={{ color: 'var(--tlink)' }}>RSS page</a>.
        </div>
      )}

      {items.map((item, i) => (
        <a
          key={`${item.link}-${i}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', gap: 12, padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            textDecoration: 'none', color: 'inherit',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4, marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>
              {item.feedTitle} · {timeAgo(item.pubDate)}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
