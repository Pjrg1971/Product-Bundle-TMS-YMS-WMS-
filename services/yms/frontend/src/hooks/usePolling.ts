import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseApiResult } from './useApi';

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 30000,
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    setLoading((prev) => (data === null ? true : prev));
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();

    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, intervalMs);

    const onVisibilityChange = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [load, intervalMs]);

  return { data, loading, error, refetch: load };
}
