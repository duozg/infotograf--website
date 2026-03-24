export type ColumnType = 'home' | 'explore' | 'hashtag' | 'fediverse' | 'rss';

export interface ColumnConfig {
  id: string;
  type: ColumnType;
  params?: Record<string, string>;
}

export const COLUMN_LABELS: Record<ColumnType, string> = {
  home: 'Feed',
  explore: 'Explore',
  hashtag: 'Hashtag',
  fediverse: 'Fediverse',
  rss: 'RSS Feeds',
};
