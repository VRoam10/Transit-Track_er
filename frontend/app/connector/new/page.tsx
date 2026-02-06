'use client';

import Sidebar from '@/components/Sidebar';
import Link from 'next/dist/client/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Connector() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [url, setUrl] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

    const handleCreateConnector = async () => {
        try {
            const payload = {
                name,
                apiUrl: url,
            };
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            const response = await fetch(`${apiUrl}/api/connector/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to create Connector (${response.status})`);
            }

            const result = await response.json();
            setSaveMessage({ type: 'success', text: 'Connector created successfully!' });
        } catch (err) {
            setSaveMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to create Connector',
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <>
                <Sidebar />
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <main className='flex'>
                <Sidebar />
                <section className="connector ml-64 flex-1 py-20 px-4 bg-gray-50 dark:bg-black">
                    <div className="max-w-5xl mx-auto">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold text-center mb-8">Create Your Connector</h2>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">Connector Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 mb-2">API URL</label>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>
                                <button
                                    onClick={handleCreateConnector}
                                    disabled={saving}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    {saving ? 'Saving...' : 'Create Connector'}
                                </button>
                                {saveMessage && (
                                    <p className={`mt-4 ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                        {saveMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}