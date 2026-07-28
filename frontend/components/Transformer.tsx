'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { connectorApi, PreviewResult } from '@/lib/connectorApi';
import {
    ConnectorDefinition,
    KIND_BY_SUBROUTE,
    RequestSpec,
    MappingSpec,
    emptyDefinition,
    extractSourcePaths,
    diagnosticsByTarget,
} from '@/lib/connectorDefinition';
import RequestPanel from '@/components/connector/RequestPanel';
import MappingPanel from '@/components/connector/MappingPanel';
import PreviewPanel from '@/components/connector/PreviewPanel';

type Props = {
    subroute: string;
    connectorId: string;
};

/** Drops mapping fields that carry no authoring content — no source, no expr, no ops. */
function pruneMapping(mapping: MappingSpec): MappingSpec {
    return {
        fields: mapping.fields.filter((f) => f.expr || f.source || (f.ops && f.ops.length > 0)),
    };
}

/** Applies a secrets draft (new/changed values, `null` = delete) onto the existing name list. */
function applySecretsDraft(existingNames: string[], draft: Record<string, string | null>): string[] {
    const next = new Set(existingNames);
    for (const [key, value] of Object.entries(draft)) {
        if (value === null) next.delete(key);
        else next.add(key);
    }
    return Array.from(next);
}

export default function Transformer({ subroute, connectorId }: Props) {
    const router = useRouter();
    const kind = KIND_BY_SUBROUTE[subroute];

    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [definition, setDefinition] = useState<ConnectorDefinition>(emptyDefinition());
    const [secrets, setSecrets] = useState<Record<string, string | null>>({});
    const [secretNames, setSecretNames] = useState<string[]>([]);
    const [testParams, setTestParams] = useState<Record<string, string>>({});
    const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Read the auth token once on mount; bounce to the landing page if absent.
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/');
            return;
        }
        setToken(storedToken);
    }, [router]);

    // Hydrate the draft definition from the backend. Run imperatively (rather than
    // via useFetch) so a 404 — meaning this resource hasn't been saved yet — can be
    // treated as "start from an empty definition" instead of a hard error.
    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        (async () => {
            try {
                const data = await connectorApi.getResource(connectorId, subroute, token);
                if (cancelled) return;
                setDefinition(data.definition);
                setSecretNames(Object.keys(data.secrets));
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Failed to load resource';
                if (message.toLowerCase().includes('not found')) {
                    setDefinition(emptyDefinition());
                    setSecretNames([]);
                } else {
                    setLoadError(message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, connectorId, subroute]);

    const sourcePaths = extractSourcePaths(previewResult?.raw, definition.response.rootPath);
    const diagnostics = diagnosticsByTarget(previewResult?.diagnostics ?? []);

    const handleRequestChange = (request: RequestSpec) => {
        setDefinition((prev) => ({ ...prev, request }));
    };

    const handleMappingChange = (mapping: MappingSpec) => {
        setDefinition((prev) => ({ ...prev, mapping }));
    };

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        setSaveMessage(null);
        try {
            const pruned: ConnectorDefinition = { ...definition, mapping: pruneMapping(definition.mapping) };
            await connectorApi.saveResource(connectorId, subroute, { name: subroute, definition: pruned, secrets }, token);
            setDefinition(pruned);
            setSecretNames((prev) => applySecretsDraft(prev, secrets));
            setSecrets({});
            setSaveMessage({ type: 'success', text: 'Saved successfully!' });
        } catch (err) {
            setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className='ml-64 flex-1 bg-gray-50 dark:bg-black'>
                <div className='flex items-center justify-center min-h-screen'>
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className='ml-64 flex-1 bg-gray-50 dark:bg-black'>
            <div className="py-6 px-6 max-w-6xl mx-auto space-y-6">
                {loadError && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                        {loadError}
                    </div>
                )}

                <RequestPanel
                    request={definition.request}
                    secrets={secrets}
                    secretNames={secretNames}
                    onRequestChange={handleRequestChange}
                    onSecretsChange={setSecrets}
                />

                <MappingPanel
                    kind={kind}
                    mapping={definition.mapping}
                    sourcePaths={sourcePaths}
                    diagnostics={diagnostics}
                    onChange={handleMappingChange}
                />

                {token && (
                    <PreviewPanel
                        connectorId={connectorId}
                        subroute={subroute}
                        token={token}
                        definition={definition}
                        secrets={secrets}
                        testParams={testParams}
                        onTestParamsChange={setTestParams}
                        onResult={setPreviewResult}
                    />
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-5 flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={14} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    {saveMessage && (
                        <p
                            className={`text-sm ${
                                saveMessage.type === 'success'
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-red-700 dark:text-red-300'
                            }`}
                        >
                            {saveMessage.text}
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}
