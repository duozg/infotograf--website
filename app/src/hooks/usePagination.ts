import { useState, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { PaginatedResponse } from '../models';

interface UsePaginationOptions<T> {
  fetcher: (cursor: string | null) => Promise<PaginatedResponse<T>>;
}

interface UsePaginationResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  setItems: Dispatch<SetStateAction<T[]>>;
}

export function usePagination<T>({ fetcher }: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const result = await fetcherRef.current(cursor);
      setItems(prev => append ? [...prev, ...result.items] : result.items);
      cursorRef.current = result.nextCursor;
      setHasMore(result.nextCursor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const refresh = useCallback(() => {
    cursorRef.current = null;
    load(null, false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (cursorRef.current && !loadingMore) {
      load(cursorRef.current, true);
    }
  }, [load, loadingMore]);

  // Initial load
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializedRef.current = true;
    // We trigger via useEffect in the component, so just set up state here
  }

  return { items, loading, loadingMore, error, hasMore, loadMore, refresh, setItems };
}
