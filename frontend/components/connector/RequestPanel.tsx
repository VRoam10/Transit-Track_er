'use client';

import { useState } from 'react';
import { RequestSpec, PaginationSpec } from '@/lib/connectorDefinition';

type Props = {
    request: RequestSpec;
    secrets: Record<string, string | null>;
    secretNames: string[];
    onRequestChange: (r: RequestSpec) => void;
    onSecretsChange: (s: Record<string, string | null>) => void;
};

const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white';
const smallInputClass =
    'px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const labelClass = 'block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1';
const optionalHint = 'normal-case font-normal text-gray-400 dark:text-gray-500';
const addBtnClass =
    'px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0';
const removeBtnClass = 'text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition p-1 shrink-0';

/** Resets pagination to a valid, minimal shape for a newly chosen style. */
function defaultPaginationForStyle(style: PaginationSpec['style']): PaginationSpec {
    switch (style) {
        case 'none':
            return { style: 'none' };
        case 'offset':
            return { style: 'offset', limit: 50, offsetParam: 'offset' };
        case 'page':
            return { style: 'page', limit: 50, pageParam: 'page' };
        case 'cursor':
            return { style: 'cursor', limit: 50, cursorParam: 'cursor', cursorPath: '' };
        default: {
            const _exhaustive: never = style;
            return _exhaustive;
        }
    }
}

function withoutKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
    const next = { ...obj };
    delete next[key];
    return next;
}

/** Key/value rows editor for `headers` / `query` — add, edit, remove rows immutably. */
function KeyValueRows({
    title,
    entries,
    onChange,
}: {
    title: string;
    entries: Record<string, string> | undefined;
    onChange: (next: Record<string, string>) => void;
}) {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const rows = Object.entries(entries ?? {});

    const updateRow = (index: number, key: string, value: string) => {
        const next = rows.map<[string, string]>((row, i) => (i === index ? [key, value] : row));
        onChange(Object.fromEntries(next));
    };
    const removeRow = (index: number) => {
        onChange(Object.fromEntries(rows.filter((_, i) => i !== index)));
    };
    const addRow = () => {
        const key = newKey.trim();
        if (!key) return;
        onChange({ ...(entries ?? {}), [key]: newValue });
        setNewKey('');
        setNewValue('');
    };

    return (
        <div>
            <label className={labelClass}>{title}</label>
            <div className="space-y-2">
                {rows.map(([key, value], index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            className={`${smallInputClass} flex-1 font-mono`}
                            placeholder="key"
                            value={key}
                            onChange={(e) => updateRow(index, e.target.value, value)}
                        />
                        <input
                            type="text"
                            className={`${smallInputClass} flex-1 font-mono`}
                            placeholder="value"
                            value={value}
                            onChange={(e) => updateRow(index, key, e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className={removeBtnClass}
                            aria-label={`Remove ${title.toLowerCase()} row`}
                        >
                            &times;
                        </button>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        className={`${smallInputClass} flex-1 font-mono`}
                        placeholder="key"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addRow()}
                    />
                    <input
                        type="text"
                        className={`${smallInputClass} flex-1 font-mono`}
                        placeholder="value"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addRow()}
                    />
                    <button type="button" onClick={addRow} disabled={!newKey.trim()} className={addBtnClass}>
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Style-specific inputs for the current `PaginationSpec` — never renders a field the style doesn't have. */
function PaginationFields({
    pagination,
    onChange,
}: {
    pagination: PaginationSpec;
    onChange: (p: PaginationSpec) => void;
}) {
    switch (pagination.style) {
        case 'none':
            return <p className="text-xs text-gray-400 dark:text-gray-500 italic">No pagination — a single request is issued.</p>;

        case 'offset': {
            const p = pagination;
            return (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Offset param</label>
                        <input type="text" className={inputClass} value={p.offsetParam} onChange={(e) => onChange({ ...p, offsetParam: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Limit</label>
                        <input type="number" className={inputClass} value={p.limit} onChange={(e) => onChange({ ...p, limit: e.target.value === '' ? 0 : Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className={labelClass}>Limit param <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="text"
                            className={inputClass}
                            value={p.limitParam ?? ''}
                            onChange={(e) => onChange({ ...p, limitParam: e.target.value === '' ? undefined : e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Total path <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="text"
                            className={inputClass}
                            value={p.totalPath ?? ''}
                            onChange={(e) => onChange({ ...p, totalPath: e.target.value === '' ? undefined : e.target.value })}
                        />
                    </div>
                </div>
            );
        }

        case 'page': {
            const p = pagination;
            return (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Page param</label>
                        <input type="text" className={inputClass} value={p.pageParam} onChange={(e) => onChange({ ...p, pageParam: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Start page <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="number"
                            className={inputClass}
                            value={p.startPage ?? ''}
                            onChange={(e) => onChange({ ...p, startPage: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Limit</label>
                        <input type="number" className={inputClass} value={p.limit} onChange={(e) => onChange({ ...p, limit: e.target.value === '' ? 0 : Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className={labelClass}>Limit param <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="text"
                            className={inputClass}
                            value={p.limitParam ?? ''}
                            onChange={(e) => onChange({ ...p, limitParam: e.target.value === '' ? undefined : e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Total path <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="text"
                            className={inputClass}
                            value={p.totalPath ?? ''}
                            onChange={(e) => onChange({ ...p, totalPath: e.target.value === '' ? undefined : e.target.value })}
                        />
                    </div>
                </div>
            );
        }

        case 'cursor': {
            const p = pagination;
            return (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Cursor param</label>
                        <input type="text" className={inputClass} value={p.cursorParam} onChange={(e) => onChange({ ...p, cursorParam: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Cursor path</label>
                        <input type="text" className={inputClass} value={p.cursorPath} onChange={(e) => onChange({ ...p, cursorPath: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Limit</label>
                        <input type="number" className={inputClass} value={p.limit} onChange={(e) => onChange({ ...p, limit: e.target.value === '' ? 0 : Number(e.target.value) })} />
                    </div>
                    <div>
                        <label className={labelClass}>Limit param <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="text"
                            className={inputClass}
                            value={p.limitParam ?? ''}
                            onChange={(e) => onChange({ ...p, limitParam: e.target.value === '' ? undefined : e.target.value })}
                        />
                    </div>
                </div>
            );
        }

        default: {
            const _exhaustive: never = pagination;
            void _exhaustive;
            return null;
        }
    }
}

/**
 * Secrets draft editor. `secrets` holds only pending CHANGES — a new value
 * for an existing name, `null` to delete an existing name, or a brand-new
 * name/value pair. Unchanged existing secrets are simply absent from the
 * draft; nothing here ever reveals a previously-saved secret's value.
 */
function SecretsEditor({
    secrets,
    secretNames,
    onChange,
}: {
    secrets: Record<string, string | null>;
    secretNames: string[];
    onChange: (s: Record<string, string | null>) => void;
}) {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const setNewValueFor = (name: string, value: string) => {
        if (value === '') {
            onChange(withoutKey(secrets, name));
            return;
        }
        onChange({ ...secrets, [name]: value });
    };
    const markDeleted = (name: string) => onChange({ ...secrets, [name]: null });
    const undoChange = (name: string) => onChange(withoutKey(secrets, name));

    const addedEntries = Object.entries(secrets).filter(([key, value]) => !secretNames.includes(key) && value !== null);

    const renameAdded = (key: string, nextKey: string) => {
        const value = secrets[key];
        onChange({ ...withoutKey(secrets, key), [nextKey]: value });
    };
    const updateAddedValue = (key: string, value: string) => onChange({ ...secrets, [key]: value });
    const removeAdded = (key: string) => onChange(withoutKey(secrets, key));

    const addSecret = () => {
        const key = newKey.trim();
        if (!key || secretNames.includes(key)) return;
        onChange({ ...secrets, [key]: newValue });
        setNewKey('');
        setNewValue('');
    };

    return (
        <div className="space-y-2">
            {secretNames.map((name) => {
                const draft = secrets[name];
                const isDeleted = draft === null;
                return (
                    <div key={name} className="flex items-center gap-2">
                        <span
                            className={`w-32 shrink-0 text-sm font-mono truncate ${isDeleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}
                            title={name}
                        >
                            {name}
                        </span>
                        {isDeleted ? (
                            <>
                                <span className="flex-1 text-xs text-red-600 dark:text-red-400 italic">Marked for deletion</span>
                                <button type="button" onClick={() => undoChange(name)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                                    Undo
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    type="password"
                                    className={`${smallInputClass} flex-1 font-mono`}
                                    placeholder="unchanged — enter a new value to replace"
                                    value={typeof draft === 'string' ? draft : ''}
                                    onChange={(e) => setNewValueFor(name, e.target.value)}
                                />
                                <button type="button" onClick={() => markDeleted(name)} className={removeBtnClass} aria-label={`Delete secret ${name}`}>
                                    &times;
                                </button>
                            </>
                        )}
                    </div>
                );
            })}

            {addedEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                    <input
                        type="text"
                        className={`${smallInputClass} w-32 shrink-0 font-mono`}
                        placeholder="name"
                        value={key}
                        onChange={(e) => renameAdded(key, e.target.value)}
                    />
                    <input
                        type="password"
                        className={`${smallInputClass} flex-1 font-mono`}
                        placeholder="value"
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => updateAddedValue(key, e.target.value)}
                    />
                    <button type="button" onClick={() => removeAdded(key)} className={removeBtnClass} aria-label={`Remove secret ${key}`}>
                        &times;
                    </button>
                </div>
            ))}

            <div className="flex items-center gap-2 pt-2 mt-1 border-t border-gray-100 dark:border-gray-700">
                <input
                    type="text"
                    className={`${smallInputClass} w-32 shrink-0 font-mono`}
                    placeholder="name"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSecret()}
                />
                <input
                    type="password"
                    className={`${smallInputClass} flex-1 font-mono`}
                    placeholder="value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSecret()}
                />
                <button type="button" onClick={addSecret} disabled={!newKey.trim() || secretNames.includes(newKey.trim())} className={addBtnClass}>
                    Add secret
                </button>
            </div>

            {secretNames.length === 0 && addedEntries.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">No secrets defined yet.</p>
            )}
        </div>
    );
}

/**
 * Editor for a connector's `RequestSpec` (method, url, headers, query,
 * timeout, pagination) plus its secrets draft. Fully controlled — every
 * edit builds a new object via the `onRequestChange` / `onSecretsChange`
 * callbacks; props are never mutated in place.
 */
export default function RequestPanel({ request, secrets, secretNames, onRequestChange, onSecretsChange }: Props) {
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Request</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How this connector fetches data from the external API</p>
                </div>
                <div className="px-6 py-5 space-y-5">
                    <div className="flex gap-3">
                        <div className="w-28 shrink-0">
                            <label className={labelClass}>Method</label>
                            <select
                                className={inputClass}
                                value={request.method}
                                onChange={(e) => onRequestChange({ ...request, method: e.target.value as RequestSpec['method'] })}
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className={labelClass}>URL</label>
                            <input
                                type="text"
                                className={`${inputClass} font-mono`}
                                placeholder="https://api.example.com/data"
                                value={request.url}
                                onChange={(e) => onRequestChange({ ...request, url: e.target.value })}
                            />
                        </div>
                    </div>

                    <KeyValueRows title="Headers" entries={request.headers} onChange={(headers) => onRequestChange({ ...request, headers })} />
                    <KeyValueRows title="Query parameters" entries={request.query} onChange={(query) => onRequestChange({ ...request, query })} />

                    <div className="w-48">
                        <label className={labelClass}>Timeout (ms) <span className={optionalHint}>(optional)</span></label>
                        <input
                            type="number"
                            className={inputClass}
                            placeholder="e.g. 5000"
                            min={0}
                            value={request.timeoutMs ?? ''}
                            onChange={(e) => onRequestChange({ ...request, timeoutMs: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Pagination style</label>
                        <select
                            className={`${inputClass} w-48`}
                            value={request.pagination.style}
                            onChange={(e) =>
                                onRequestChange({ ...request, pagination: defaultPaginationForStyle(e.target.value as PaginationSpec['style']) })
                            }
                        >
                            <option value="none">None</option>
                            <option value="offset">Offset</option>
                            <option value="page">Page</option>
                            <option value="cursor">Cursor</option>
                        </select>
                        <div className="mt-3">
                            <PaginationFields pagination={request.pagination} onChange={(pagination) => onRequestChange({ ...request, pagination })} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Secrets</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Sensitive values referenced from headers/query — saved values are never shown again, only replaced or deleted
                    </p>
                </div>
                <div className="px-6 py-5">
                    <SecretsEditor secrets={secrets} secretNames={secretNames} onChange={onSecretsChange} />
                </div>
            </div>
        </div>
    );
}
