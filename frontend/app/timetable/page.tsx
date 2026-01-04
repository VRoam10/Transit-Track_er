'use client';

import Header from '@/components/Header';
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
                <section className="timetables py-20 px-4 bg-gray-50">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-8">Your Timetables</h2>
                        <Timetables />
                    </div>
                </section>
            </main>
        </>
    )
}