'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Footer() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    return (
    <footer className="snap-center h-screen bg-gray-800 text-white text-center py-30 py-8">
        <p className="mb-4">&copy; 2025 Transit Tracker. All rights reserved.</p>
        <ul className="flex justify-center space-x-6">
            <li><Link href="/" className="hover:text-blue-400">Home</Link></li>
            <li><Link href="/contact" className="hover:text-blue-400">Contact</Link></li>
            <li><Link href="/rgpd" className="hover:text-blue-400">Privacy Policy</Link></li>
        </ul>
    </footer>
    );
}
