'use client';

import { useFetch } from '@/hooks/useFetch';
import Link from 'next/dist/client/link';
import { useEffect, useState } from 'react';

interface Connector {
    id: string;
    name: string;
    [key: string]: any;
}

export default function Connector() {
    const [token, setToken] = useState<string | null>(null);
    const { data, loading, error } = useFetch<Connector[]>(
        '/api/connector',
        { token }
    );

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    if (loading) {
        return <div className="text-center text-gray-500">Loading connectors...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">Error: {error}</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500">No connectors found</div>;
    }

    return (
        <div className="space-y-4">
            {data.map((connector) => (
                <div key={connector.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                    <Link href={`/connector/${connector.id}`} className="block">
                        <h3 className="text-xl font-bold text-blue-600 mb-2">{connector.name}</h3>
                        <p className="text-gray-600">ID: {connector.id}</p>
                    </Link>
                </div>
            ))}
        </div>
    );
}
