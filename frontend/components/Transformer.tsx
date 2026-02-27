'use client';

import { useFetch } from '@/hooks/useFetch';
import { useRouter } from 'next/navigation';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from 'react';

interface FieldMapping {
    original: string;
    transformed: string;
}

interface ComplianceField {
    [key: string]: string; // "Int", "String", "Boolean", etc.
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
            // If obj is an array, process first item
            if (obj.length > 0) {
                return getNestedFields(obj[0], prefix);
            }
            return mappings;
        }

        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;

            // Add the field itself (including array names)
            mappings.push({
                original: path,
                transformed: path,
            });

            // If it's an array, process the first item's fields
            if (Array.isArray(value) && value.length > 0) {
                const firstItem = value[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                    mappings.push(...getNestedFields(firstItem, path));
                }
            }
            // If it's a nested object, recursively get its fields
            else if (typeof value === 'object' && value !== null) {
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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

    const handleFetch = () => fetchFromUrl(url);

    const handleLoadRecord = () => {
        if (recordData?.apiUrl) {
            setUrl(recordData.apiUrl);
            fetchFromUrl(recordData.apiUrl, recordData.transformation);
        }
    };

    const updateFieldMapping = (index: number, newTransformed: string) => {
        const updated = [...fieldMappings];
        updated[index].transformed = newTransformed;
        setFieldMappings(updated);
    };

    const deleteFieldMapping = (index: number) => {
        const updated = fieldMappings.filter((_, i) => i !== index);
        setFieldMappings(updated);
    };

    const validateAgainstCompliance = (transformed: any, compliance: any) => {
        const issues: string[] = [];
        const matches: string[] = [];

        const checkObject = (obj: any, schema: any, path = ''): void => {
            if (!obj || !schema) return;

            // Handle arrays
            if (Array.isArray(schema)) {
                if (!Array.isArray(obj)) {
                    issues.push(`${path} should be an array but got ${typeof obj}`);
                    return;
                }
                if (obj.length === 0) return; // Skip validation for empty arrays

                // Check first item against schema
                checkObject(obj[0], schema[0], path);
                return;
            }

            // Handle objects
            if (typeof schema === 'object' && schema !== null) {
                for (const [key, schemaType] of Object.entries(schema)) {
                    const fullPath = path ? `${path}.${key}` : key;

                    if (!(key in obj)) {
                        issues.push(`Missing field: ${fullPath}`);
                    } else {
                        const value = obj[key];
                        const valueType = typeof value;

                        // Check type
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

                // Check for extra fields
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
        if (!transformedData || !url) {
            setSaveMessage({ type: 'error', text: 'Please fetch data and perform transformation first' });
            return;
        }

        setSaving(true);
        setSaveMessage(null);

        try {
            const payload = {
                name: subroute,
                apiUrl: url,
                transformation: fieldMappings,
            };
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
                throw new Error(errorData.message || `Failed to save transformation (${response.status})`);
            }

            const result = await response.json();
            setSaveMessage({ type: 'success', text: 'Transformation saved successfully!' });
        } catch (err) {
            setSaveMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to save transformation',
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
                        // Remove empty objects from arrays
                        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                            return Object.keys(item).length > 0;
                        }
                        return true;
                    });
            }

            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }

            const transformed: any = {};

            for (const [key, value] of Object.entries(obj)) {
                const path = prefix ? `${prefix}.${key}` : key;
                const mapping = fieldMappings.find(m => m.original === path);

                // Skip if field is deleted
                if (!mapping) {
                    continue;
                }

                const newKey = mapping.transformed.split('.').pop() || mapping.transformed;

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Recursively handle nested objects
                    const nestedTransformed = transformObject(value, path);
                    if (Object.keys(nestedTransformed).length > 0) {
                        transformed[newKey] = nestedTransformed;
                    }
                } else if (Array.isArray(value)) {
                    // Handle arrays
                    transformed[newKey] = transformObject(value, path);
                } else {
                    // Set simple values
                    transformed[newKey] = value;
                }
            }

            return transformed;
        };

        const result = transformObject(data);
        setTransformedData(result);
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
            <div className='ml-64 flex-1'>
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                </div>
            </div>
        );
    }

    if (loading_compliance) {
        return <div className="text-center text-gray-600 dark:text-gray-300">Loading compliance...</div>;
    }

    if (error_compliance) {
        return <div className="text-center text-red-500">Error: {error_compliance}</div>;
    }

    if (!data_compliance) {
        return <div className="text-center text-gray-600 dark:text-gray-300">No compliance data found</div>;
    }

    return (
        <>
            <main className='ml-64 flex-1 bg-gray-50 dark:bg-black'>
                <section className="transformer py-6 px-6">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-3xl font-bold mb-8">API Transformer</h1>

                        {/* URL Input Section */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API URL</label>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://api.example.com/data"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <button
                                    onClick={handleFetch}
                                    disabled={fetching}
                                    className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {fetching ? 'Fetching...' : 'Fetch Data'}
                                </button>
                                <button
                                    onClick={handleLoadRecord}
                                    disabled={recordLoading}
                                    className="w-full bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                                >
                                    {recordLoading ? 'Loading...' : 'Load Saved Transformation'}
                                </button>
                                {recordError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {recordError}
                                    </div>
                                )}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {error}
                                    </div>
                                )}
                                {saveMessage && (
                                    <div className={`${saveMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border px-4 py-3 rounded-lg`}>
                                        {saveMessage.text}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Field Mapping Section */}
                        {data && fieldMappings.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold">Transform Fields</h2>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">These mappings will be applied to all items in the list</p>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-4">
                                    {fieldMappings.map((mapping, index) => {
                                        const depth = (mapping.original.match(/\./g) || []).length;
                                        const displayName = mapping.original.split('.').pop() || mapping.original;
                                        const isNested = depth > 0;

                                        return (
                                            <div key={index} className="flex gap-4 items-end bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                        {isNested && <span className="text-gray-500 dark:text-gray-400 block mb-1">📁 {mapping.original}</span>}
                                                        {!isNested && <span className="text-gray-500 dark:text-gray-400">Field name</span>}
                                                    </label>
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{mapping.original}</div>
                                                </div>
                                                <div className="text-gray-400">→</div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Rename to</label>
                                                    <input
                                                        type="text"
                                                        value={mapping.transformed}
                                                        onChange={(e) => updateFieldMapping(index, e.target.value)}
                                                        placeholder={mapping.original}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => deleteFieldMapping(index)}
                                                    className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition"
                                                    title="Delete this field"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={handleTransform}
                                    className="w-full bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition mt-6"
                                >
                                    Transform All Items
                                </button>
                            </div>
                        )}

                        <section className='flex gap-6 flex-col lg:flex-row'>

                            {/* Original Data Display */}
                            {data && (
                                <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-2xl font-bold">Original Data</h2>
                                        <button
                                            onClick={() => downloadJSON(data, 'original-data.json')}
                                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                                        >
                                            Download
                                        </button>
                                    </div>
                                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-150">
                                        {JSON.stringify(data, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Transformed Data Display */}
                            {transformedData && (
                                <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-2xl font-bold">Transformed Data</h2>
                                        <button
                                            onClick={() => downloadJSON(transformedData, 'transformed-data.json')}
                                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                        >
                                            Download
                                        </button>
                                    </div>
                                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto max-h-150">
                                        {JSON.stringify(transformedData, null, 2)}
                                    </pre>
                                    <div className="space-y-2 mt-4">
                                        <button
                                            onClick={handleValidate}
                                            className="w-full bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition"
                                        >
                                            Validate Against Compliance
                                        </button>
                                        <button
                                            onClick={handleSaveTransformation}
                                            disabled={saving}
                                            className="w-full bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Transformation'}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </section>
                        {/* Compliance Validation Result */}
                        {complianceResult && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mt-8">
                                <h2 className="text-2xl font-bold mb-6">Compliance Validation Result</h2>

                                {complianceResult.issues.length === 0 ? (
                                    <div className="bg-green-50 dark:bg-green-200 border-l-4 border-green-600 p-4 mb-6">
                                        <p className="text-green-800 font-semibold">✓ Data matches compliance schema!</p>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 dark:bg-red-200 border-l-4 border-red-600 p-4 mb-6">
                                        <p className="text-red-800 font-semibold mb-3">✕ Compliance issues found:</p>
                                        <ul className="space-y-2">
                                            {complianceResult.issues.map((issue: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, idx: Key | null | undefined) => (
                                                <li key={idx} className="text-red-700 text-sm">• {issue}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {complianceResult.matches.length > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-200 border-l-4 border-blue-600 p-4">
                                        <p className="text-blue-800 font-semibold mb-3">Matching fields:</p>
                                        <ul className="space-y-1">
                                            {complianceResult.matches.map((match: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, idx: Key | null | undefined) => (
                                                <li key={idx} className="text-blue-700 text-sm">{match}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
                <section className="compliance py-6 px-6">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">Expected Data Format</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">Schema that your transformed data should match</p>

                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            {data_compliance && data_compliance.data && data_compliance.data.length > 0 && (
                                <div className="space-y-6">
                                    {/* Render compliance schema */}
                                    <div className="bg-gradient-to-r from-custom-blue to-custom-red dark:from-custom-darkblue dark:to-custom-darkred text-white rounded-lg p-6 mb-6">
                                        <h3 className="text-2xl font-bold">Root Schema</h3>
                                    </div>

                                    {/* Render total_count field */}
                                    {data_compliance.total_count && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">total_count</h4>
                                                </div>
                                                <div className="px-4 py-2 rounded border-2 font-bold text-center bg-green-100 text-green-800 border-green-300">
                                                    {data_compliance.total_count}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Render data array field */}
                                    {data_compliance.data && data_compliance.data.length > 0 && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">data</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Array of objects</p>
                                                </div>
                                                <div className="px-4 py-2 rounded border-2 font-bold text-center bg-purple-100 text-purple-800 border-purple-300">
                                                    Array
                                                </div>
                                            </div>

                                            {/* Nested fields within data array */}
                                            <div className="mt-4 ml-4 space-y-3 border-l-2 border-gray-300 pl-4">
                                                {data_compliance.data[0] && Object.entries(data_compliance.data[0]).map(([key, type]: [string, any], fieldIdx: number) => {
                                                    const getTypeColor = (t: any) => {
                                                        if (t === 'String') return 'bg-blue-100 text-blue-800 border-blue-300';
                                                        if (t === 'Int') return 'bg-green-100 text-green-800 border-green-300';
                                                        if (t === 'Boolean') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                                                        if (Array.isArray(t)) return 'bg-purple-100 text-purple-800 border-purple-300';
                                                        if (t === 'Datetime') return 'bg-indigo-100 text-indigo-800 border-indigo-300';
                                                        if (typeof t === 'object') return 'bg-pink-100 text-pink-800 border-pink-300';
                                                        if (t.substr(t.length - 1) == '?') return 'bg-amber-100 text-amber-800 border-amber-300';
                                                        return 'bg-gray-100 text-gray-800 border-gray-300';
                                                    };

                                                    return (
                                                        <div key={fieldIdx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded hover:shadow-md transition">
                                                            <div className="flex-1">
                                                                <h5 className="font-semibold text-gray-800 dark:text-gray-200">{key}</h5>
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded border font-bold ${getTypeColor(type)}`}>
                                                                {typeof type === 'string' ? type : typeof type}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}