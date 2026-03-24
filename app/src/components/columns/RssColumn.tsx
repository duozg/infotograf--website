import React, { useEffect, useState, RefObject } from 'react';

interface RssFeed {
  url: string;
  title: string;
  iconUrl?: string;
}

interface FeedItem {
  feedTitle: string;
  feedIcon?: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string;
}

function loadFeeds(): RssFeed[] {
  try { return JSON.parse(localStorage.getItem('rss_feeds') || '[]'); } catch { return []; }
}

async function fetchFeedItems(url: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(`/api/rss/feed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []) as FeedItem[];
  } catch { return []; }
}

interface RssColumnProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function RssColumn({ scrollContainerRef: _scrollContainerRef }: RssColumnProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const feeds = loadFeeds();
    if (feeds.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(feeds.map(f => fetchFeedItems(f.url)))
      .then(results => {
        if (cancelled) return;
        const all = results.flat().sort((a, b) =>
          new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        );
        setItems(all.slice(0, 50));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>Loading feeds…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          No RSS feeds yet. Add feeds from the <a href="/rss" style={{ color: 'var(--tlink)' }}>RSS page</a>.
        </div>
      )}

      {items.map((item, i) => (
        <a
          key={`${item.link}-${i}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border)',
            textDecoration: 'none', color: 'inherit',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.4, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>
            {item.feedTitle} · {new Date(item.pubDate).toLocaleDateString()}
          </div>
        </a>
      ))}
    </div>
  );
}
