'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const connectorSubroutes = [
    { key: '', label: 'Overview' },
    { key: 'line', label: 'Lines' },
    { key: 'stop', label: 'Stops' },
    { key: 'direction', label: 'Directions' },
    { key: 'nxpassage', label: 'Next Passages' },
];

export default function Sidebar() {
    const pathname = usePathname();

    // Match /connector/[id] or /connector/[id]/subroute (but not /connector/new)
    const connectorMatch = pathname.match(/^\/connector\/([^/]+)(\/[^/]+)?$/);
    const connectorId = connectorMatch && connectorMatch[1] !== 'new' ? connectorMatch[1] : null;

    return (
        <div className="fixed top-0 left-0 h-full w-64 bg-gray-800 text-white p-4 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">
                <Link href="/">Transit Tracker</Link>
            </h1>
            <ul className="space-y-1">
                <li>
                    <Link
                        href="/dashboard"
                        className={`block px-4 py-2 rounded transition hover:bg-gray-700 ${pathname === '/dashboard' ? 'bg-gray-700' : ''}`}
                    >
                        Dashboard
                    </Link>
                </li>
                <li>
                    <Link
                        href="/timetable"
                        className={`block px-4 py-2 rounded transition hover:bg-gray-700 ${pathname === '/timetable' ? 'bg-gray-700' : ''}`}
                    >
                        Timetable
                    </Link>
                </li>
                <li>
                    <Link
                        href="/connector"
                        className={`block px-4 py-2 rounded transition hover:bg-gray-700 ${pathname.startsWith('/connector') ? 'bg-gray-700' : ''}`}
                    >
                        Connector
                    </Link>

                    {/* Expanded sub-navigation when on a specific connector */}
                    {connectorId && (
                        <ul className="mt-1 ml-3 border-l border-gray-600 pl-2 space-y-0.5">
                            {connectorSubroutes.map(({ key, label }) => {
                                const href = key
                                    ? `/connector/${connectorId}/${key}`
                                    : `/connector/${connectorId}`;
                                const isActive = pathname === href;
                                return (
                                    <li key={key}>
                                        <Link
                                            href={href}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition hover:bg-gray-700 ${isActive
                                                    ? 'bg-gray-600 text-white'
                                                    : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </li>
            </ul>
        </div>
    );
}
