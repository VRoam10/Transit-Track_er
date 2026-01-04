'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
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
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />

            <main>
                <section className="dashboard py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-4xl font-bold text-center mb-4">Dashboard</h1>
                        <div className="flex bg-white p-8 rounded-lg shadow-lg">
                            <div className="flex-1 text-center text-gray-600">
                                <h2 className='text-2xl text-center mb-3'>Timetable</h2>
                                <Link href="/timetable" className='bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700'>View!</Link>
                            </div>
                            <div className="flex-1 text-center text-gray-600">
                                <h2 className='text-2xl text-center mb-3'>Connector</h2>
                                <Link href="/connector" className='bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700'>View!</Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}