'use client';

import Link from 'next/link';

export default function Sidebar() {

    return (
        <div className="fixed top-0 left-0 h-full w-64 bg-gray-800 text-white p-4">
            <h1 className="text-2xl font-bold mb-6"><Link href="/">Transit Tracker</Link></h1>
            <ul className="space-y-4">
                <li>
                    <Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-700">
                        Dashboard
                    </Link>
                </li>
                <li>
                    <Link href="/timetable" className="block px-4 py-2 rounded hover:bg-gray-700">
                        Timetable
                    </Link>
                </li>
                <li>
                    <Link href="/connector" className="block px-4 py-2 rounded hover:bg-gray-700">
                        Connector
                    </Link>
                </li>
            </ul>
        </div >
    );
}
