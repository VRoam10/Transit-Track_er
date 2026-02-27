'use client';

import { useFetch } from '@/hooks/useFetch';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Save, Tag } from 'lucide-react';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from 'react';

interface FieldMapping {
    original: string;
    transformed: string;
}

interface ComplianceField {
    [key: string]: string;
}

interface ComplianceSchema {
    total_count?: string;
    data?: ComplianceField[];
    [key: string]: any;
}

type Props = {
    subroute: string;
    connectorId: string;
};

export default function Transformer({ subroute, connectorId }: Props) {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [url, setUrl] = useState('');
    const [params, setParams] = useState<string[]>([]);
    const [newParam, setNewParam] = useState('');
    const [testParams, setTestParams] = useState<Record<string, string>>({});
    const [fetching, setFetching] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
    const [transformedData, setTransformedData] = useState<any>(null);
    const router = useRouter();
    const [complianceResult, setComplianceResult] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const hasAutoFetched = useRef(false);

    const { data: data_compliance, loading: loading_compliance, error: error_compliance } = useFetch<ComplianceSchema>(
        `/api/connector/compliance/${subroute}`,
        { token }
    );
    const { data: recordData, loading: recordLoading, error: recordError } = useFetch<any>(
        `/api/connector/${connectorId}/${subroute}`,
        { token }
    );

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/');
        } else {
            setToken(storedToken);
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (recordData && !hasAutoFetched.current && recordData.apiUrl) {
            hasAutoFetched.current = true;
            setUrl(recordData.apiUrl);
            if (recordData.params && Array.isArray(recordData.params)) setParams(recordData.params);
            fetchFromUrl(recordData.apiUrl, recordData.transformation);
        }
    }, [recordData]);

    useEffect(() => {
        if (data && fieldMappings.length > 0) {
            handleTransform();
        }
    }, [data, fieldMappings]);

    useEffect(() => {
        if (transformedData && data_compliance) {
            const result = validateAgainstCompliance(transformedData, data_compliance);
            setComplianceResult(result);
        }
    }, [transformedData]);

    const getNestedFields = (obj: any, prefix = ''): FieldMapping[] => {
        const mappings: FieldMapping[] = [];

        if (Array.isArray(obj)) {
            if (obj.length > 0) return getNestedFields(obj[0], prefix);
            return mappings;
        }

        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            mappings.push({ original: path, transformed: path });

            if (Array.isArray(value) && value.length > 0) {
                const firstItem = value[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                    mappings.push(...getNestedFields(firstItem, path));
                }
            } else if (typeof value === 'object' && value !== null) {
                mappings.push(...getNestedFields(value, path));
            }
        }

        return mappings;
    };

    const fetchFromUrl = async (targetUrl: string, savedMappings?: FieldMapping[]) => {
        if (!targetUrl) {
            setError('Please enter a URL');
            return;
        }

        setFetching(true);
        setError(null);
        setData(null);
        setTransformedData(null);
        setComplianceResult(null);

        try {
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            setData(result);

            if (savedMappings && savedMappings.length > 0) {
                setFieldMappings(savedMappings);
            } else {
                setFieldMappings(getNestedFields(result));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setFetching(false);
        }
    };

    const buildEffectiveUrl = (baseUrl: string, values: Record<string, string>) => {
        let result = baseUrl;
        for (const [key, value] of Object.entries(values)) {
            if (value) result = result.replaceAll(`{${key}}`, encodeURIComponent(value));
        }
        return result;
    };

    const addParam = () => {
        const key = newParam.trim().replace(/\s+/g, '_');
        if (!key || params.includes(key)) return;
        setParams([...params, key]);
        setNewParam('');
    };

    const removeParam = (key: string) => {
        setParams(params.filter(p => p !== key));
        setTestParams(prev => { const next = { ...prev }; delete next[key]; return next; });
    };

    const handleFetch = () => fetchFromUrl(buildEffectiveUrl(url, testParams));

    const handleLoadRecord = () => {
        if (recordData?.apiUrl) {
            setUrl(recordData.apiUrl);
            if (recordData.params && Array.isArray(recordData.params)) setParams(recordData.params);
            fetchFromUrl(recordData.apiUrl, recordData.transformation);
        }
    };

    const updateFieldMapping = (index: number, newTransformed: string) => {
        const updated = [...fieldMappings];
        updated[index].transformed = newTransformed;
        setFieldMappings(updated);
    };

    const deleteFieldMapping = (index: number) => {
        setFieldMappings(fieldMappings.filter((_, i) => i !== index));
    };

    const validateAgainstCompliance = (transformed: any, compliance: any) => {
        const issues: string[] = [];
        const matches: string[] = [];

        const checkObject = (obj: any, schema: any, path = ''): void => {
            if (!obj || !schema) return;

            if (Array.isArray(schema)) {
                if (!Array.isArray(obj)) {
                    issues.push(`${path} should be an array but got ${typeof obj}`);
                    return;
                }
                if (obj.length === 0) return;
                checkObject(obj[0], schema[0], path);
                return;
            }

            if (typeof schema === 'object' && schema !== null) {
                for (const [key, schemaType] of Object.entries(schema)) {
                    const fullPath = path ? `${path}.${key}` : key;
                    if (!(key in obj)) {
                        issues.push(`Missing field: ${fullPath}`);
                    } else {
                        const value = obj[key];
                        const valueType = typeof value;
                        if (schemaType === 'String' && valueType !== 'string') {
                            issues.push(`${fullPath} should be String but got ${valueType}`);
                        } else if (schemaType === 'Int' && valueType !== 'number') {
                            issues.push(`${fullPath} should be Int but got ${valueType}`);
                        } else if (schemaType === 'Boolean' && valueType !== 'boolean') {
                            issues.push(`${fullPath} should be Boolean but got ${valueType}`);
                        } else if (Array.isArray(schemaType)) {
                            checkObject(value, schemaType, fullPath);
                        } else if (typeof schemaType === 'object') {
                            checkObject(value, schemaType, fullPath);
                        } else {
                            matches.push(`✓ ${fullPath} (${schemaType})`);
                        }
                    }
                }
                for (const key of Object.keys(obj)) {
                    if (!(key in schema)) {
                        issues.push(`Extra field: ${path ? `${path}.${key}` : key}`);
                    }
                }
            }
        };

        checkObject(transformed, compliance);
        return { issues, matches };
    };

    const handleValidate = () => {
        if (!transformedData || !data_compliance) return;
        const result = validateAgainstCompliance(transformedData, data_compliance);
        setComplianceResult(result);
    };

    const handleSaveTransformation = async () => {
        if (!url) {
            setSaveMessage({ type: 'error', text: 'Please enter a URL first' });
            return;
        }

        setSaving(true);
        setSaveMessage(null);

        try {
            const payload: Record<string, any> = {
                name: subroute,
                apiUrl: url,
                transformation: fieldMappings,
            };
            payload.params = params;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const response = await fetch(`${apiUrl}/api/connector/${connectorId}/${subroute}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to save (${response.status})`);
            }

            setSaveMessage({ type: 'success', text: 'Saved successfully!' });
        } catch (err) {
            setSaveMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to save',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTransform = () => {
        if (!data) return;

        const transformObject = (obj: any, prefix = ''): any => {
            if (Array.isArray(obj)) {
                return obj
                    .map(item => transformObject(item, prefix))
                    .filter(item => {
                        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                            return Object.keys(item).length > 0;
                        }
                        return true;
                    });
            }

            if (typeof obj !== 'object' || obj === null) return obj;

            const transformed: any = {};
            for (const [key, value] of Object.entries(obj)) {
                const path = prefix ? `${prefix}.${key}` : key;
                const mapping = fieldMappings.find(m => m.original === path);
                if (!mapping) continue;

                const newKey = mapping.transformed.split('.').pop() || mapping.transformed;
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const nestedTransformed = transformObject(value, path);
                    if (Object.keys(nestedTransformed).length > 0) transformed[newKey] = nestedTransformed;
                } else if (Array.isArray(value)) {
                    transformed[newKey] = transformObject(value, path);
                } else {
                    transformed[newKey] = value;
                }
            }
            return transformed;
        };

        setTransformedData(transformObject(data));
    };

    const downloadJSON = (jsonData: any, filename: string) => {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(jsonData, null, 2)));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    if (loading) {
        return (
            <div className='ml-64 flex-1 flex items-center justify-center min-h-screen'>
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (loading_compliance) {
        return (
            <div className='ml-64 flex-1 flex items-center justify-center min-h-screen'>
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading compliance schema...</p>
                </div>
            </div>
        );
    }

    if (error_compliance) {
        return (
            <div className='ml-64 flex-1 flex items-center justify-center min-h-screen'>
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                    <p className="text-red-700 dark:text-red-300 font-semibold">Error loading compliance schema</p>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error_compliance}</p>
                </div>
            </div>
        );
    }

    if (!data_compliance) {
        return (
            <div className='ml-64 flex-1 flex items-center justify-center min-h-screen'>
                <p className="text-gray-500 dark:text-gray-400">No compliance schema found for <span className="font-semibold">{subroute}</span></p>
            </div>
        );
    }

    return (
        <main className='ml-64 flex-1 bg-gray-50 dark:bg-black'>
            <div className="py-6 px-6 max-w-6xl mx-auto space-y-6">

                {/* Configuration Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">API Configuration</h3>
                        <button
                            onClick={handleLoadRecord}
                            disabled={recordLoading || !recordData?.apiUrl}
                            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-3 py-1.5 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={14} />
                            {recordLoading ? 'Loading...' : 'Load Saved'}
                        </button>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">API URL</label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://api.example.com/data"
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide mb-2">
                                URL Parameters <span className="normal-case font-normal text-gray-400 dark:text-gray-500">(optional)</span>
                            </label>
                            {/* Existing params as tags */}
                            {params.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {params.map(p => (
                                        <span key={p} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-mono px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600">
                                            <Tag size={10} className="text-gray-400" />
                                            {`{${p}}`}
                                            <button onClick={() => removeParam(p)} className="text-gray-400 hover:text-red-500 transition leading-none">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Add param input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newParam}
                                    onChange={(e) => setNewParam(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addParam()}
                                    placeholder="e.g. stop_id"
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                                />
                                <button
                                    onClick={addParam}
                                    disabled={!newParam.trim()}
                                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                                >
                                    Add
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                                Add params then use <code className="font-mono">&#123;param_name&#125;</code> as a placeholder in the URL above.
                            </p>
                        </div>

                        {/* Test values — one input per param */}
                        {params.length > 0 && (
                            <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Test Values</p>
                                <div className="space-y-2">
                                    {params.map(p => (
                                        <div key={p} className="flex gap-2 items-center">
                                            <code className="text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded border border-amber-200 dark:border-amber-700 shrink-0">
                                                {`{${p}}`}
                                            </code>
                                            <span className="text-amber-400 text-xs shrink-0">=</span>
                                            <input
                                                type="text"
                                                value={testParams[p] ?? ''}
                                                onChange={(e) => setTestParams(prev => ({ ...prev, [p]: e.target.value }))}
                                                placeholder={`test value for ${p}`}
                                                className="flex-1 px-3 py-1.5 text-sm border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                                {url && params.some(p => testParams[p]) && (
                                    <div className="text-xs text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-200 dark:border-amber-800">
                                        <span className="font-semibold">Effective URL: </span>
                                        <code className="font-mono break-all">{buildEffectiveUrl(url, testParams)}</code>
                                    </div>
                                )}
                            </div>
                        )}

                        {recordError && (
                            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                                {recordError}
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        {saveMessage && (
                            <div className={`px-4 py-3 rounded-lg text-sm border ${saveMessage.type === 'success' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                                {saveMessage.text}
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={handleFetch}
                                disabled={fetching || !url}
                                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw size={14} className={fetching ? 'animate-spin' : ''} />
                                {fetching ? 'Fetching...' : 'Fetch Data'}
                            </button>
                            <button
                                onClick={handleSaveTransformation}
                                disabled={saving || !url}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={14} />
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Field Mapping Card */}
                {data && fieldMappings.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Field Mappings</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rename or remove fields — changes apply to all items</p>
                            </div>
                            <button
                                onClick={handleTransform}
                                className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                            >
                                Apply
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                            {fieldMappings.map((mapping, index) => {
                                const depth = (mapping.original.match(/\./g) || []).length;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                        style={{ paddingLeft: `${24 + depth * 16}px` }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{mapping.original}</p>
                                        </div>
                                        <span className="text-gray-300 dark:text-gray-600 text-sm">→</span>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={mapping.transformed}
                                                onChange={(e) => updateFieldMapping(index, e.target.value)}
                                                className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                                            />
                                        </div>
                                        <button
                                            onClick={() => deleteFieldMapping(index)}
                                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition p-1 rounded"
                                            title="Remove field"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Data Preview */}
                {data && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Original Data</h3>
                                <button
                                    onClick={() => downloadJSON(data, 'original-data.json')}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                                >
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                            <div className="px-6 py-5">
                                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto max-h-96 text-gray-700 dark:text-gray-300">
                                    {JSON.stringify(data, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* Transformed */}
                        {transformedData && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Transformed Data</h3>
                                    <button
                                        onClick={() => downloadJSON(transformedData, 'transformed-data.json')}
                                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                                    >
                                        <Download size={14} />
                                        Download
                                    </button>
                                </div>
                                <div className="px-6 py-5 space-y-3">
                                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto max-h-96 text-gray-700 dark:text-gray-300">
                                        {JSON.stringify(transformedData, null, 2)}
                                    </pre>
                                    <button
                                        onClick={handleValidate}
                                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                                    >
                                        Validate Against Compliance
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Compliance Result */}
                {complianceResult && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Compliance Result</h3>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            {complianceResult.issues.length === 0 ? (
                                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
                                    <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓</span>
                                    <p className="text-green-800 dark:text-green-300 font-semibold text-sm">Data matches the compliance schema</p>
                                </div>
                            ) : (
                                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <p className="text-red-700 dark:text-red-300 font-semibold text-sm mb-2">{complianceResult.issues.length} issue{complianceResult.issues.length > 1 ? 's' : ''} found</p>
                                    <ul className="space-y-1">
                                        {complianceResult.issues.map((issue: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, idx: Key | null | undefined) => (
                                            <li key={idx} className="text-red-700 dark:text-red-400 text-xs font-mono">• {issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {complianceResult.matches.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <p className="text-blue-700 dark:text-blue-300 font-semibold text-sm mb-2">{complianceResult.matches.length} matching field{complianceResult.matches.length > 1 ? 's' : ''}</p>
                                    <ul className="space-y-1">
                                        {complianceResult.matches.map((match: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, idx: Key | null | undefined) => (
                                            <li key={idx} className="text-blue-700 dark:text-blue-400 text-xs font-mono">{match}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Expected Format */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Expected Data Format</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Schema your transformed data must match</p>
                    </div>
                    <div className="px-6 py-5">
                        {data_compliance && data_compliance.data && data_compliance.data.length > 0 ? (
                            <div className="space-y-4">
                                {data_compliance.total_count && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">total_count</span>
                                        <span className="text-xs px-2 py-1 rounded border font-bold bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                                            {data_compliance.total_count}
                                        </span>
                                    </div>
                                )}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">data</span>
                                        <span className="text-xs px-2 py-1 rounded border font-bold bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700">Array</span>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data_compliance.data[0] && Object.entries(data_compliance.data[0]).map(([key, type]: [string, any], fieldIdx: number) => {
                                            const getTypeColor = (t: any) => {
                                                if (t === 'String') return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700';
                                                if (t === 'Int') return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700';
                                                if (t === 'Boolean') return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700';
                                                if (Array.isArray(t)) return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700';
                                                if (t === 'Datetime') return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700';
                                                if (typeof t === 'object') return 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900 dark:text-pink-300 dark:border-pink-700';
                                                if (typeof t === 'string' && t.endsWith('?')) return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700';
                                                return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
                                            };
                                            return (
                                                <div key={fieldIdx} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                                    <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{key}</span>
                                                    <span className={`text-xs px-2 py-1 rounded border font-bold ${getTypeColor(type)}`}>
                                                        {typeof type === 'string' ? type : typeof type}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No schema fields defined.</p>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}
