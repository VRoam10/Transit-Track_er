'use client';

import { useFetch } from '@/hooks/useFetch';
import Link from 'next/link';
import { ArrowRight, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ConnectorData {
    id: string;
    name: string;
    apiUrl: string;
}

const subroutes = [
    { key: 'line', label: 'Lines' },
    { key: 'stop', label: 'Stops' },
    { key: 'direction', label: 'Directions' },
    { key: 'nxpassage', label: 'Next Passages' },
] as const;

export default function Connector({ connector }: { connector: string }) {
    const [token, setToken] = useState<string | null>(null);
    const { data, loading, error } = useFetch<ConnectorData>(
        `/api/connector/${connector}`,
        { token }
    );

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading connector...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <p className="text-red-700 dark:text-red-300 font-semibold">Error loading connector</p>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">Connector not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Connector Details</h3>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">Name</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{data.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">ID</p>
                        <p className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">{data.id}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">API URL</p>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                            <Globe size={14} className="text-gray-400 shrink-0" />
                            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{data.apiUrl || '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-resource Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Configure Sub-resources</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {subroutes.map(({ key, label }) => (
                        <Link
                            key={key}
                            href={`/connector/${connector}/${key}`}
                            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition group"
                        >
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
                            <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
