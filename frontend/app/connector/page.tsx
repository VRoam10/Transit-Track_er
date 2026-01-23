'use client';

import Connectors from '@/components/Connectors';
import Header from '@/components/Header';
import Link from 'next/dist/client/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Connector() {
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
                <div className=' bg-gray-50'>
                    <Link href={`/dashboard`} className="bg-blue-600 text-white px-4 py-2 rounded-br-lg hover:bg-blue-700">Back to Dashboard</Link>
                </div>
                <section className="timetables py-20 px-4 bg-gray-50">
                    <div className="max-w-5xl mx-auto">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold text-center mb-8">Your Connector</h2>
                            <Connectors />
                            <div className="bg-blue-600 p-6 rounded-lg shadow hover:shadow-lg transition">
                                <Link href={`/connector/new`} className="block text-center text-white font-bold">
                                    Add New Connector
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}