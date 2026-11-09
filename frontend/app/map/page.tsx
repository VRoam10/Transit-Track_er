'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                <p className="text-sm text-gray-500">Loading map…</p>
            </div>
        </div>
    ),
});

export default function MapPage() {
    return (
        <main className="flex h-screen overflow-hidden">
            <section className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-black">
                <LiveMap />
            </section>
        </main>
    );
}
