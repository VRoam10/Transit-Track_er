'use client';

import { Op } from '@/lib/connectorDefinition';

type Props = {
    op: Op;
    onChange: (op: Op) => void;
};

const inputClass =
    'px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent';
const labelClass = 'text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap';

function parseList(value: string): string[] {
    return value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

function toDisplayString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    return String(value);
}

/**
 * Compact inline editor for a single transform `Op`. Renders the field
 * inputs relevant to `op.op` and calls `onChange` with a new, immutably
 * updated op on every edit. Fully controlled — no internal op state.
 */
export default function OpEditor({ op, onChange }: Props) {
    switch (op.op) {
        case 'default':
        case 'const':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>value</span>
                    <input
                        type="text"
                        className={inputClass}
                        value={toDisplayString(op.value)}
                        onChange={(e) => onChange({ ...op, value: e.target.value })}
                    />
                </div>
            );

        case 'toInt':
        case 'toFloat':
        case 'toString':
        case 'toBool':
            return <span className="text-xs text-gray-400 dark:text-gray-500 italic">no options</span>;

        case 'parseDate':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>from</span>
                    <input
                        type="text"
                        className={`${inputClass} flex-1 min-w-[10rem]`}
                        placeholder="unix | unixMs | iso | DD/MM/YYYY"
                        value={op.from}
                        onChange={(e) => onChange({ ...op, from: e.target.value })}
                    />
                </div>
            );

        case 'formatDate':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>to</span>
                    <input
                        type="text"
                        className={`${inputClass} flex-1 min-w-[8rem]`}
                        placeholder="iso | YYYY-MM-DD"
                        value={op.to}
                        onChange={(e) => onChange({ ...op, to: e.target.value })}
                    />
                </div>
            );

        case 'coalesce':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>paths</span>
                    <input
                        type="text"
                        className={`${inputClass} flex-1 min-w-[10rem]`}
                        placeholder="path.a, path.b"
                        value={op.paths.join(', ')}
                        onChange={(e) => onChange({ ...op, paths: parseList(e.target.value) })}
                    />
                </div>
            );

        case 'concat':
            return (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={labelClass}>sep</span>
                    <input
                        type="text"
                        className={`${inputClass} w-14`}
                        value={op.sep ?? ''}
                        onChange={(e) => onChange({ ...op, sep: e.target.value === '' ? undefined : e.target.value })}
                    />
                    <span className={labelClass}>parts</span>
                    <input
                        type="text"
                        className={`${inputClass} flex-1 min-w-[10rem]`}
                        placeholder="path.a, path.b"
                        value={op.parts.join(', ')}
                        onChange={(e) => onChange({ ...op, parts: parseList(e.target.value) })}
                    />
                </div>
            );

        case 'prefix':
        case 'suffix':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>value</span>
                    <input
                        type="text"
                        className={inputClass}
                        value={op.value}
                        onChange={(e) => onChange({ ...op, value: e.target.value })}
                    />
                </div>
            );

        case 'lookup': {
            const entries = Object.entries(op.map);

            const updateEntry = (index: number, key: string, value: unknown) => {
                const next = entries.map<[string, unknown]>((entry, i) => (i === index ? [key, value] : entry));
                onChange({ ...op, map: Object.fromEntries(next) });
            };
            const removeEntry = (index: number) => {
                const next = entries.filter((_, i) => i !== index);
                onChange({ ...op, map: Object.fromEntries(next) });
            };
            const addEntry = () => {
                onChange({ ...op, map: { ...op.map, '': '' } });
            };

            return (
                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-col gap-1">
                        {entries.map(([key, value], index) => (
                            <div key={index} className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    className={`${inputClass} w-20`}
                                    placeholder="key"
                                    value={key}
                                    onChange={(e) => updateEntry(index, e.target.value, value)}
                                />
                                <span className="text-gray-300 dark:text-gray-600 text-xs">&rarr;</span>
                                <input
                                    type="text"
                                    className={`${inputClass} w-20`}
                                    placeholder="value"
                                    value={toDisplayString(value)}
                                    onChange={(e) => updateEntry(index, key, e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeEntry(index)}
                                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition text-xs px-1"
                                    aria-label="Remove entry"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addEntry}
                            className="self-start text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            + add entry
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={labelClass}>fallback</span>
                        <input
                            type="text"
                            className={`${inputClass} w-24`}
                            value={toDisplayString(op.fallback)}
                            onChange={(e) =>
                                onChange({ ...op, fallback: e.target.value === '' ? undefined : e.target.value })
                            }
                        />
                    </div>
                </div>
            );
        }

        case 'round':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>decimals</span>
                    <input
                        type="number"
                        className={`${inputClass} w-16`}
                        value={op.decimals ?? ''}
                        onChange={(e) =>
                            onChange({ ...op, decimals: e.target.value === '' ? undefined : Number(e.target.value) })
                        }
                    />
                </div>
            );

        case 'multiply':
            return (
                <div className="flex items-center gap-2">
                    <span className={labelClass}>by</span>
                    <input
                        type="number"
                        className={`${inputClass} w-16`}
                        value={op.by}
                        onChange={(e) => onChange({ ...op, by: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                </div>
            );

        default: {
            const _exhaustive: never = op;
            void _exhaustive;
            return null;
        }
    }
}
