import { useEffect, useRef, RefObject } from 'react';

export function useContainerScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  { hasMore, loadMore }: { hasMore: boolean; loadMore: () => void }
) {
  const loadingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (loadingRef.current || !hasMore) return;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining < 400) {
        loadingRef.current = true;
        loadMore();
        setTimeout(() => { loadingRef.current = false; }, 1000);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef, hasMore, loadMore]);
}
