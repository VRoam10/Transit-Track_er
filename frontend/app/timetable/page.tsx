'use client';

import Sidebar from '@/components/Sidebar';
import Timetables from '@/components/Timetables';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Timetable() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');

        if (!storedToken) {
            router.push('/');
        } else {
            setToken(storedToken);
            setLoading(false);
        }
    }, [router]);

    if (loading) {
        return (
            <>
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <main className='flex'>
                <Sidebar />
                <section className="timetables ml-64 flex-1 py-6 px-6 bg-gray-50 dark:bg-black">
                    <div>
                        <h2 className="text-3xl font-bold mb-8">Your Timetables</h2>
                        <Timetables />
                    </div>
                </section>
            </main>
        </>
    )
}