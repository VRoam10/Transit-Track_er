'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-50 bg-white shadow">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <div className="text-2xl font-bold text-blue-600">
                    <Link href="/">Transit Tracker</Link>
                </div>
                <ul className="flex space-x-8">
                    <li>
                        <a href="#features" className="text-gray-700 hover:text-blue-600">Features</a>
                    </li>
                    <li>
                        <a href="#pricing" className="text-gray-700 hover:text-blue-600">Pricing</a>
                    </li>
                    <li>
                        <Link href="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
                    </li>
                    {token && (
                        <li>
                            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                                Dashboard
                            </Link>
                        </li>
                    )}
                    {token ? (
                    <li>
                        <Link href="/"
                            onClick={handleLogout}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                            Log out
                        </Link>
                    </li>
                    ) : (
                    <li>
                        <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Log in
                        </Link>
                    </li>
                    )}
                </ul>
            </nav >
        </header >
    );
}
