'use client';

import { useFetch } from '@/hooks/useFetch';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Plug, CheckCircle, XCircle } from 'lucide-react';

interface Timetable {
    id: string;
    enabled: boolean;
    createdAt: string;
    timetable: Record<string, any>;
}

interface Connector {
    id: string;
    name: string;
    [key: string]: any;
}

function DonutChart({ active, inactive }: { active: number; inactive: number }) {
    const total = active + inactive;
    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-40">
                <p className="text-gray-400 text-sm">No timetables yet</p>
            </div>
        );
    }

    const radius = 54;
    const cx = 80;
    const cy = 80;
    const circumference = 2 * Math.PI * radius;
    const activeFraction = active / total;
    const inactiveFraction = inactive / total;
    const activeDash = activeFraction * circumference;
    const inactiveDash = inactiveFraction * circumference;
    // Start at top (rotate -90deg via offset)
    const activeOffset = 0;
    const inactiveOffset = -(activeDash);

    return (
        <div className="flex items-center justify-center gap-8 py-2">
            <svg width="160" height="160" viewBox="0 0 160 160">
                {/* Background ring */}
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="22" />
                {/* Active arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="22"
                    strokeDasharray={`${activeDash} ${circumference - activeDash}`}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="butt"
                />
                {/* Inactive arc */}
                {inactive > 0 && (
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="22"
                        strokeDasharray={`${inactiveDash} ${circumference - inactiveDash}`}
                        strokeDashoffset={circumference * 0.25 - activeDash}
                        strokeLinecap="butt"
                    />
                )}
                {/* Center label */}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#111827">{total}</text>
                <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#9ca3af">total</text>
            </svg>
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Active</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{active}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Inactive</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{inactive}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
                    <span className="text-sm text-gray-400">
                        {total > 0 ? `${Math.round(activeFraction * 100)}% active` : '—'}
                    </span>
                </div>
            </div>
        </div>
    );
}

function ConnectorBarChart({ connectors }: { connectors: Connector[] }) {
    if (!connectors.length) {
        return (
            <div className="flex items-center justify-center h-40">
                <p className="text-gray-400 text-sm">No connectors yet</p>
            </div>
        );
    }

    const svgHeight = 140;
    const barHeight = 70;
    const barGap = 12;
    const barWidth = Math.min(56, Math.max(28, Math.floor((340 - barGap) / connectors.length) - barGap));
    const totalWidth = connectors.length * (barWidth + barGap) - barGap;
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#34d399'];

    return (
        <div className="overflow-x-auto py-2">
            <svg
                width={Math.max(totalWidth, 200)}
                height={svgHeight}
                className="mx-auto block"
                style={{ minWidth: '100%' }}
            >
                {connectors.map((c, i) => {
                    const x = i * (barWidth + barGap);
                    const y = svgHeight - barHeight - 24;
                    const color = colors[i % colors.length];
                    const label = c.name.length > 9 ? c.name.slice(0, 8) + '…' : c.name;
                    return (
                        <g key={c.id}>
                            <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={color} opacity="0.85" />
                            <text
                                x={x + barWidth / 2}
                                y={svgHeight - 6}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#6b7280"
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <p className="text-center text-xs text-gray-400 mt-1">1 bar = 1 connector</p>
        </div>
    );
}

export default function Dashboard() {
    const [token, setToken] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();

    const { data: timetables, loading: tLoading } = useFetch<Timetable[]>('/api/timetables', { token });
    const { data: connectors, loading: cLoading } = useFetch<Connector[]>('/api/connector', { token });

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/');
        } else {
            setToken(storedToken);
            setAuthLoading(false);
        }
    }, [router]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    const activeTimetables = timetables?.filter(t => t.enabled).length ?? 0;
    const inactiveTimetables = timetables?.filter(t => !t.enabled).length ?? 0;
    const totalTimetables = timetables?.length ?? 0;
    const totalConnectors = connectors?.length ?? 0;

    const statCards = [
        {
            label: 'Total Timetables',
            value: tLoading ? '—' : totalTimetables,
            icon: <Activity size={22} className="text-blue-500" />,
            color: 'border-l-blue-500',
        },
        {
            label: 'Active',
            value: tLoading ? '—' : activeTimetables,
            icon: <CheckCircle size={22} className="text-green-500" />,
            color: 'border-l-green-500',
        },
        {
            label: 'Inactive',
            value: tLoading ? '—' : inactiveTimetables,
            icon: <XCircle size={22} className="text-red-500" />,
            color: 'border-l-red-500',
        },
        {
            label: 'Connectors',
            value: cLoading ? '—' : totalConnectors,
            icon: <Plug size={22} className="text-purple-500" />,
            color: 'border-l-purple-500',
        },
    ];

    return (
        <main className="flex">
            <Sidebar />
            <section className="dashboard ml-64 flex-1 py-6 px-6 bg-gray-50 dark:bg-black">
                <div>
                    <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {statCards.map((card) => (
                            <div
                                key={card.label}
                                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 border-l-4 ${card.color}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                                    {card.icon}
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Timetable Status Chart */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Timetable Status</h3>
                                <Link
                                    href="/timetable"
                                    className="text-xs text-blue-500 hover:text-blue-600 transition"
                                >
                                    View all →
                                </Link>
                            </div>
                            <div className="p-6">
                                {tLoading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                                    </div>
                                ) : (
                                    <DonutChart active={activeTimetables} inactive={inactiveTimetables} />
                                )}
                            </div>
                        </div>

                        {/* Connector Chart */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Connectors</h3>
                                <Link
                                    href="/connector"
                                    className="text-xs text-blue-500 hover:text-blue-600 transition"
                                >
                                    View all →
                                </Link>
                            </div>
                            <div className="p-6">
                                {cLoading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                                    </div>
                                ) : (
                                    <ConnectorBarChart connectors={connectors ?? []} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
