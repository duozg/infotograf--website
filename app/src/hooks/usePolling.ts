import { useEffect, useRef, useCallback } from 'react';

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    timerRef.current = setInterval(() => {
      callbackRef.current();
    }, intervalMs);
  }, [intervalMs, stop]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    // Call immediately, then on interval
    callbackRef.current();
    start();
    return stop;
  }, [enabled, start, stop]);
}
