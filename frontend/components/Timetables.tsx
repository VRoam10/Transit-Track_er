'use client';

import { useFetch } from '@/hooks/useFetch';
import { useEffect, useState } from 'react';

interface Timetable {
    id: string;
    name: string;
    [key: string]: any;
}

export default function Timetables() {
    const [token, setToken] = useState<string | null>(null);
    const { data, loading, error } = useFetch<Timetable[]>(
        '/api/timetables',
        { token }
    );

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    if (loading) {
        return <div className="text-center text-gray-500">Loading timetables...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">Error: {error}</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-center text-gray-500">No timetables found</div>;
    }

    return (
        <div className="space-y-4">
            {data.map((timetable) => (
                <div key={timetable.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                    <h3 className="text-xl font-bold text-blue-600 mb-2">{timetable.name}</h3>
                    <p className="text-gray-600">ID: {timetable.id}</p>
                    {/* Add more fields as needed */}
                </div>
            ))}
        </div>
    );
}
