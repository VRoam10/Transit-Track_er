interface FieldMapping {
    original: string;
    transformed: string;
}

export function applyTransformation(data: any, fieldMappings: FieldMapping[]): any {
    if (!fieldMappings || fieldMappings.length === 0) return data;

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

        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key;
            const mapping = fieldMappings.find(m => m.original === path);
            if (!mapping) continue;

            const newKey = mapping.transformed.split('.').pop() || mapping.transformed;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const nested = transformObject(value, path);
                if (Object.keys(nested).length > 0) result[newKey] = nested;
            } else if (Array.isArray(value)) {
                result[newKey] = transformObject(value, path);
            } else {
                result[newKey] = value;
            }
        }
        return result;
    };

    return transformObject(data);
}

export function missingParams(params: string[], query: Record<string, any>): string[] {
    return params.filter(p => query[p] === undefined || query[p] === '');
}

export function buildUrl(apiUrl: string, params: string[], query: Record<string, any>): string {
    let url = apiUrl;
    for (const param of params) {
        const value = query[param];
        if (value !== undefined) {
            url = url.replace(`{${param}}`, encodeURIComponent(String(value)));
        }
    }
    return url;
}
