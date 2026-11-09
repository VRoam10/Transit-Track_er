import { useEffect, useState } from 'react';

interface UseFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
  skip?: boolean;
}

export function useFetch<T>(endpoint: string, options: UseFetchOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.skip) return;
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.token && { Authorization: `Bearer ${options.token}` }),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.error ? `Error: ${result.error}` : `Error: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result); setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'An error occurred'); setData(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [endpoint, options.token, options.skip]);

  return { data, loading, error };
}
