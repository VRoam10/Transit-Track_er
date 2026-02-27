'use client';

import { useFetch } from '@/hooks/useFetch';
import { Eye, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Timetable {
    id: string;
    enabled: boolean;
    createdAt: string;
    timetable: Record<string, any>;
    userId?: number;
}

export default function Timetables() {
    const [token, setToken] = useState<string | null>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const { data, loading, error } = useFetch<Timetable[]>(
        '/api/timetables',
        { token }
    );
    const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        setToken(localStorage.getItem('token'));
    }, []);

    const handleDelete = async (id: string) => {
        if (!token) return;
        try {
            await fetch(`${apiUrl}/api/timetables/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            window.location.reload();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleToggleEnabled = async (id: string, enabled: boolean) => {
        if (!token) return;
        try {
            await fetch(`${apiUrl}/api/timetables/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled: !enabled })
            });
            window.location.reload();
        } catch (err) {
            console.error('Update failed:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500">Loading timetables...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700 font-semibold">Error loading timetables</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Timetables Management</h3>
                <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">
                    <Plus size={18} />
                    New Timetable
                </button>
            </div>

            {/* Table Board */}
            {!data || data.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No timetables found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Create your first timetable to get started</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 font-semibold text-sm text-gray-700 dark:text-gray-300">
                        <div className="col-span-3">ID</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-3">Created</div>
                        <div className="col-span-4 text-right">Actions</div>
                    </div>

                    {/* Table Rows */}
                    {data.map((timetable, index) => (
                        <div
                            key={timetable.id}
                            className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${index !== data.length - 1 ? 'border-b border-gray-200' : ''
                                } hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer ${timetable.enabled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800'
                                }`}
                            onClick={() => setSelectedTimetable(timetable)}
                        >
                            {/* ID */}
                            <div className="col-span-3">
                                <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{timetable.id}</p>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${timetable.enabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {timetable.enabled ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Created Date */}
                            <div className="col-span-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(timetable.createdAt)}</p>
                            </div>

                            {/* Actions */}
                            <div className="col-span-4 flex gap-2 justify-end">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTimetable(timetable);
                                    }}
                                    className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition text-sm"
                                    title="View details"
                                >
                                    <Eye size={16} />
                                    View
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleEnabled(timetable.id, timetable.enabled);
                                    }}
                                    className={`flex items-center gap-1 px-3 py-2 rounded transition text-sm ${timetable.enabled
                                        ? 'text-yellow-600 hover:bg-yellow-50'
                                        : 'text-green-600 hover:bg-green-50'
                                        }`}
                                    title={timetable.enabled ? 'Disable' : 'Enable'}
                                >
                                    {timetable.enabled ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm(timetable.id);
                                    }}
                                    className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded transition text-sm"
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
                    className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg"
                    onClick={() => setDeleteConfirm(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Delete Timetable?</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
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

            {/* Detail Sidebar - Right Panel */}
            {selectedTimetable && (
                <>
                    <div
                        className="fixed inset-0 h-full z-30"
                        onClick={() => setSelectedTimetable(null)}
                    />
                    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-lg z-40 overflow-y-auto border-l border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Timetable Details</h3>
                                <button
                                    onClick={() => setSelectedTimetable(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-sm text-gray-500 font-semibold mb-2">ID</p>
                                    <p className="text-sm text-gray-700 break-all font-mono bg-gray-50 p-2 rounded">
                                        {selectedTimetable.id}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 font-semibold mb-2">Status</p>
                                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${selectedTimetable.enabled
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        {selectedTimetable.enabled ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 font-semibold mb-2">Created</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(selectedTimetable.createdAt)}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 font-semibold mb-2">Timetable Data</p>
                                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto text-gray-700 border border-gray-200 max-h-96">
                                        {JSON.stringify(selectedTimetable.timetable, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
