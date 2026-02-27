'use client';

import { useFetch } from '@/hooks/useFetch';
import Link from 'next/link';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Connector {
    id: string;
    name: string;
    [key: string]: any;
}

export default function Connectors() {
    const [token, setToken] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const { data, loading, error } = useFetch<Connector[]>('/api/connector', { token });

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    const handleDelete = async (id: string) => {
        if (!token) return;
        try {
            await fetch(`${apiUrl}/api/connector/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            window.location.reload();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading connectors...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <p className="text-red-700 dark:text-red-300 font-semibold">Error loading connectors</p>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Connectors Management</h3>
                <Link
                    href="/connector/new"
                    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                    <Plus size={18} />
                    New Connector
                </Link>
            </div>

            {/* Table Board */}
            {!data || data.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No connectors found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Create your first connector to get started</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 font-semibold text-sm text-gray-700 dark:text-gray-300">
                        <div className="col-span-4">Name</div>
                        <div className="col-span-4">ID</div>
                        <div className="col-span-4 text-right">Actions</div>
                    </div>

                    {/* Table Rows */}
                    {data.map((connector, index) => (
                        <div
                            key={connector.id}
                            className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-l-4 border-l-blue-500 ${
                                index !== data.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                            } hover:bg-gray-50 dark:hover:bg-gray-700 transition`}
                        >
                            {/* Name */}
                            <div className="col-span-4">
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{connector.name}</p>
                            </div>

                            {/* ID */}
                            <div className="col-span-4">
                                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{connector.id}</p>
                            </div>

                            {/* Actions */}
                            <div className="col-span-4 flex gap-2 justify-end">
                                <Link
                                    href={`/connector/${connector.id}`}
                                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 px-3 py-2 rounded transition text-sm"
                                    title="Manage connector"
                                >
                                    <Eye size={16} />
                                    Manage
                                </Link>
                                <button
                                    onClick={() => setDeleteConfirm(connector.id)}
                                    className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 px-3 py-2 rounded transition text-sm"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div
                    className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setDeleteConfirm(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Delete Connector?</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleDelete(deleteConfirm);
                                    setDeleteConfirm(null);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
