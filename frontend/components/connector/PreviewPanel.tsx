'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { connectorApi, PreviewResult } from '@/lib/connectorApi';
import { ConnectorDefinition } from '@/lib/connectorDefinition';

type Props = {
    connectorId: string;
    subroute: string;
    token: string;
    definition: ConnectorDefinition;
    secrets: Record<string, string | null>;
    testParams: Record<string, string>;
    onTestParamsChange: (p: Record<string, string>) => void;
    onResult: (r: PreviewResult) => void;
};

const labelClass = 'block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1';
const smallInputClass =
    'px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const addBtnClass =
    'px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0';
const removeBtnClass = 'text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition p-1 shrink-0';
const preClass =
    'text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto max-h-96 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all';

/** Renders a JSON value (or an explicit "none" placeholder) in a scroll-capped `<pre>`. */
function JsonBlock({ value }: { value: unknown }) {
    const text = value === undefined ? '(none)' : JSON.stringify(value, null, 2);
    return <pre className={preClass}>{text}</pre>;
}

/** Free-form key/value editor for `testParams` — add, edit, remove rows immutably. */
function TestParamsEditor({
    params,
    onChange,
}: {
    params: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
}) {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const rows = Object.entries(params);

    const updateRow = (index: number, key: string, value: string) => {
        const next = rows.map<[string, string]>((row, i) => (i === index ? [key, value] : row));
        onChange(Object.fromEntries(next));
    };
    const removeRow = (index: number) => onChange(Object.fromEntries(rows.filter((_, i) => i !== index)));
    const addRow = () => {
        const key = newKey.trim();
        if (!key) return;
        onChange({ ...params, [key]: newValue });
        setNewKey('');
        setNewValue('');
    };

    return (
        <div>
            <label className={labelClass}>
                Test params <span className="normal-case font-normal text-gray-400 dark:text-gray-500">(sent as `params` to the preview endpoint)</span>
            </label>
            <div className="space-y-2">
                {rows.map(([key, value], index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            className={`${smallInputClass} w-32 shrink-0 font-mono`}
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
                        <button type="button" onClick={() => removeRow(index)} className={removeBtnClass} aria-label={`Remove param ${key}`}>
                            &times;
                        </button>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        className={`${smallInputClass} w-32 shrink-0 font-mono`}
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
                {rows.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 italic">No test params set.</p>}
            </div>
        </div>
    );
}

/** Shape of one `PreviewResult.diagnostics[]` entry — only the fields this summary reads. */
type DiagEntry = { status?: string };
type DiagRecord = { transform?: DiagEntry[]; validate?: DiagEntry[] };

/** Flattens every returned item's `transform`+`validate` diagnostics into an ok/problem count. */
function summarizeDiagnostics(diagnostics: DiagRecord[] | undefined): { ok: number; problem: number } | null {
    if (!diagnostics || diagnostics.length === 0) return null;
    let ok = 0;
    let problem = 0;
    for (const item of diagnostics) {
        const entries = [...(item?.transform ?? []), ...(item?.validate ?? [])];
        for (const d of entries) {
            if (d?.status === 'ok') ok++;
            else problem++;
        }
    }
    return { ok, problem };
}

/**
 * "Test" button that runs the backend preview endpoint against the
 * in-progress (possibly unsaved) `definition`/`secrets`, and renders the raw
 * response, the transformed envelope, and a diagnostics summary. Reports the
 * full `PreviewResult` back to the parent via `onResult` so it can derive
 * source-path suggestions (from `raw`) and per-target diagnostics badges
 * (from `diagnostics`) for `MappingPanel`. Nothing here is persisted.
 */
export default function PreviewPanel({
    connectorId,
    subroute,
    token,
    definition,
    secrets,
    testParams,
    onTestParamsChange,
    onResult,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PreviewResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async () => {
        setLoading(true);
        setError(null);
        try {
            // `secrets` here is the draft (Record<string, string | null>) — a
            // `null` value means "delete this saved secret", which must NOT be
            // sent as an inline preview secret (that would look like an
            // intentional empty-string override to the backend).
            const inlineSecrets = Object.fromEntries(
                Object.entries(secrets).filter(([, v]) => v !== null)
            ) as Record<string, string>;
            const r = await connectorApi.previewResource(connectorId, subroute, { definition, secrets: inlineSecrets, params: testParams }, token);
            setResult(r);
            onResult(r);
        } catch (err) {
            setResult(null);
            setError(err instanceof Error ? err.message : 'Preview failed');
        } finally {
            setLoading(false);
        }
    };

    const summary = summarizeDiagnostics(result?.diagnostics);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Preview</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Run the current (unsaved) request/mapping against the real API without saving anything
                </p>
            </div>
            <div className="px-6 py-5 space-y-5">
                <TestParamsEditor params={testParams} onChange={onTestParamsChange} />

                <button
                    type="button"
                    onClick={handleTest}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play size={14} className={loading ? 'animate-pulse' : ''} />
                    {loading ? 'Testing...' : 'Test'}
                </button>

                {error && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {result && !result.ok && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 space-y-1">
                        <p className="text-red-700 dark:text-red-300 font-semibold text-sm">
                            {result.stage ? `Failed at stage: ${result.stage}` : 'Preview failed'}
                        </p>
                        {result.message && <p className="text-red-600 dark:text-red-400 text-xs">{result.message}</p>}
                    </div>
                )}

                {summary && (
                    <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Diagnostics:</span>
                        <span className="px-2 py-0.5 rounded border font-bold text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                            {summary.ok} ok
                        </span>
                        <span className="px-2 py-0.5 rounded border font-bold text-xs bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700">
                            {summary.problem} problem{summary.problem === 1 ? '' : 's'}
                        </span>
                    </div>
                )}

                {result && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <p className={labelClass}>Raw response</p>
                            <JsonBlock value={result.raw} />
                        </div>
                        <div>
                            <p className={labelClass}>Transformed envelope</p>
                            <JsonBlock value={result.envelope} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
