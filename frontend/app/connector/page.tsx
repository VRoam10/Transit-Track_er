'use client';

import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface FieldMapping {
    original: string;
    transformed: string;
}

export default function Connector() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [url, setUrl] = useState('');
    const [fetching, setFetching] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
    const [transformedData, setTransformedData] = useState<any>(null);
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

    const handleFetch = async () => {
        if (!url) {
            setError('Please enter a URL');
            return;
        }

        setFetching(true);
        setError(null);
        setData(null);
        setFieldMappings([]);
        setTransformedData(null);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            setData(result);

            // Get all field mappings from the entire structure
            setFieldMappings(getNestedFields(result));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setFetching(false);
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
            <>
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />

            <main>
                <section className="connector py-20 px-4">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-4xl font-bold text-center mb-8">API Connector & Transformer</h1>

                        {/* URL Input Section */}
                        <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">API URL</label>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://api.example.com/data"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleFetch}
                                    disabled={fetching}
                                    className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {fetching ? 'Fetching...' : 'Fetch Data'}
                                </button>
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Field Mapping Section */}
                        {data && fieldMappings.length > 0 && (
                            <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold">Transform Fields</h2>
                                    <p className="text-gray-600 text-sm mt-2">These mappings will be applied to all items in the list</p>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded p-4">
                                    {fieldMappings.map((mapping, index) => {
                                        const depth = (mapping.original.match(/\./g) || []).length;
                                        const displayName = mapping.original.split('.').pop() || mapping.original;
                                        const isNested = depth > 0;

                                        return (
                                            <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        {isNested && <span className="text-gray-500 block mb-1">📁 {mapping.original}</span>}
                                                        {!isNested && <span className="text-gray-500">Field name</span>}
                                                    </label>
                                                    <div className="text-sm font-semibold text-gray-700">{mapping.original}</div>
                                                </div>
                                                <div className="text-gray-400">→</div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Rename to</label>
                                                    <input
                                                        type="text"
                                                        value={mapping.transformed}
                                                        onChange={(e) => updateFieldMapping(index, e.target.value)}
                                                        placeholder={mapping.original}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
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

                        {/* Original Data Display */}
                        {data && (
                            <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold">Original Data</h2>
                                    <button
                                        onClick={() => downloadJSON(data, 'original-data.json')}
                                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                                    >
                                        Download
                                    </button>
                                </div>
                                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-80">
                                    {JSON.stringify(data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Transformed Data Display */}
                        {transformedData && (
                            <div className="bg-white p-8 rounded-lg shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold">Transformed Data</h2>
                                    <button
                                        onClick={() => downloadJSON(transformedData, 'transformed-data.json')}
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        Download
                                    </button>
                                </div>
                                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-80">
                                    {JSON.stringify(transformedData, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </>
    )
}