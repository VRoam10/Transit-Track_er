'use client';

import Link from 'next/link';

export default function Header() {

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
                </ul>
            </nav >
        </header >
    );
}
