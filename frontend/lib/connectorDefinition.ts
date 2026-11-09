export type ResourceKind = 'LINE' | 'STOP' | 'DIRECTION' | 'NEXTPASSAGE';

export type Op =
  | { op: 'default'; value: unknown } | { op: 'const'; value: unknown }
  | { op: 'toInt' } | { op: 'toFloat' } | { op: 'toString' } | { op: 'toBool' }
  | { op: 'parseDate'; from: string } | { op: 'formatDate'; to: string }
  | { op: 'coalesce'; paths: string[] } | { op: 'concat'; sep?: string; parts: string[] }
  | { op: 'prefix'; value: string } | { op: 'suffix'; value: string }
  | { op: 'lookup'; map: Record<string, unknown>; fallback?: unknown }
  | { op: 'round'; decimals?: number } | { op: 'multiply'; by: number };

export interface FieldMapping { target: string; source?: string; ops?: Op[]; expr?: string; }
export interface MappingSpec { fields: FieldMapping[]; }
export type PaginationSpec =
  | { style: 'none' }
  | { style: 'offset'; limit: number; limitParam?: string; offsetParam: string; totalPath?: string }
  | { style: 'page'; limit: number; limitParam?: string; pageParam: string; startPage?: number; totalPath?: string }
  | { style: 'cursor'; limit: number; limitParam?: string; cursorParam: string; cursorPath: string };
export interface RequestSpec {
  method: 'GET' | 'POST'; url: string;
  headers?: Record<string, string>; query?: Record<string, string>; body?: unknown;
  pagination: PaginationSpec; timeoutMs?: number;
}
export interface ResponseSpec { format: 'json'; rootPath: string; errorPath?: string; }
export interface ConnectorDefinition { request: RequestSpec; response: ResponseSpec; mapping: MappingSpec; }

export const KIND_BY_SUBROUTE: Record<string, ResourceKind> = {
  line: 'LINE', stop: 'STOP', direction: 'DIRECTION', nxpassage: 'NEXTPASSAGE',
};

export type TargetType = 'String' | 'Int' | 'Float' | 'Datetime' | 'Boolean';
export interface TargetField { name: string; type?: TargetType; optional?: boolean; children?: TargetField[]; }

const TARGETS: Record<ResourceKind, TargetField[]> = {
  LINE: [{ name: 'id', type: 'String' }, { name: 'name', type: 'String' }, { name: 'color', type: 'String' }],
  STOP: [{ name: 'id', type: 'String' }, { name: 'name', type: 'String' }, { name: 'direction', type: 'Int' }, { name: 'order', type: 'Int' }],
  DIRECTION: [{ name: 'id', type: 'Int' }, { name: 'name', type: 'String' }, { name: 'parcoursId', type: 'String' }],
  NEXTPASSAGE: [
    { name: 'id', type: 'String' }, { name: 'lineId', type: 'String', optional: true },
    { name: 'name', type: 'String' }, { name: 'direction', type: 'Int' }, { name: 'nextTrain', type: 'Datetime' },
    { name: 'coordonnees', optional: true, children: [{ name: 'lat', type: 'Float', optional: true }, { name: 'lon', type: 'Float', optional: true }] },
    { name: 'extraction', type: 'Datetime', optional: true },
  ],
};

export function complianceTargets(kind: ResourceKind): TargetField[] { return TARGETS[kind]; }

export function flattenTargetPaths(kind: ResourceKind): { path: string; type: string; optional: boolean }[] {
  const out: { path: string; type: string; optional: boolean }[] = [];
  const walk = (fields: TargetField[], prefix: string) => {
    for (const f of fields) {
      const path = prefix ? `${prefix}.${f.name}` : f.name;
      if (f.children) walk(f.children, path);
      else out.push({ path, type: f.type ?? 'String', optional: !!f.optional });
    }
  };
  walk(TARGETS[kind], '');
  return out;
}

export function emptyDefinition(): ConnectorDefinition {
  return {
    request: { method: 'GET', url: '', headers: {}, query: {}, pagination: { style: 'none' } },
    response: { format: 'json', rootPath: '' },
    mapping: { fields: [] },
  };
}

function getPath(obj: any, path: string): unknown {
  if (path === '') return obj;
  return path.split('.').reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

export function extractSourcePaths(raw: unknown, rootPath: string): string[] {
  const root = getPath(raw, rootPath);
  const item = Array.isArray(root) ? root[0] : root;
  if (item == null || typeof item !== 'object') return [];
  const out: string[] = [];
  const walk = (obj: any, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.push(path);
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path);
    }
  };
  walk(item, '');
  return out;
}

export type TargetDiag = { status: 'ok' | 'missing' | 'wrongType' | 'error'; detail?: string };
const RANK: Record<TargetDiag['status'], number> = { ok: 0, missing: 2, wrongType: 2, error: 3 };

export function diagnosticsByTarget(diagnostics: any[]): Record<string, TargetDiag> {
  const out: Record<string, TargetDiag> = {};
  const first = diagnostics?.[0];
  if (!first) return out;
  const apply = (target: string, status: TargetDiag['status'], detail?: string) => {
    if (!out[target] || RANK[status] > RANK[out[target].status]) out[target] = { status, detail };
  };
  for (const d of first.transform ?? []) apply(d.target, d.status, d.detail);
  for (const d of first.validate ?? []) apply(d.target, d.status);
  return out;
}
