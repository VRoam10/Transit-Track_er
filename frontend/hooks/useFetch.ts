import { useEffect, useState } from 'react';

interface UseFetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    token?: string | null;
}

export function useFetch<T>(
    endpoint: string,
    options: UseFetchOptions = {}
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                const response = await fetch(`${apiUrl}${endpoint}`, {
                    method: options.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(options.token && { Authorization: `Bearer ${options.token}` }),
                    },
                    body: options.body ? JSON.stringify(options.body) : undefined,
                });

                if (!response.ok) {
                    const result = await response.json();
                    if (result && result.error) {
                        throw new Error(`Error: ${result.error}`);
                    }
                    throw new Error(`Error: ${response.statusText}`);
                }

                const result = await response.json();
                setData(result);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [endpoint, options.token]);

    return { data, loading, error };
}
