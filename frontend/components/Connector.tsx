'use client';

import { useFetch } from '@/hooks/useFetch';
import Link from 'next/dist/client/link';
import { useEffect, useState } from 'react';

interface Connector {
    id: string;
    name: string;
    apiUrl: string;
}

export default function Connector({ connector }: { connector: string }) {
    const [token, setToken] = useState<string | null>(null);
    const { data, loading, error } = useFetch<Connector>(
        `/api/connector/${connector}`,
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

    if (!data) {
        return <div className="text-center text-gray-500">No connectors found</div>;
    }

    return (
        <div className="space-y-4">
            <div>Connector: {data.name}</div>
            <p>API URL: {data.apiUrl}</p>
            <div className="flex mt-4">
                <Link href={`/connector/${connector}/line`} className='flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 mr-2'>Lines</Link>
                <Link href={`/connector/${connector}/stop`} className='flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 mr-2'>Stops</Link>
                <Link href={`/connector/${connector}/direction`} className='flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 mr-2'>Directions</Link>
                <Link href={`/connector/${connector}/nxpassage`} className='flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700'>Next Passages</Link>
            </div>
        </div>
    );
}
