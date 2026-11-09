export type ResourceKind = 'LINE' | 'STOP' | 'DIRECTION' | 'NEXTPASSAGE';

export type Op =
  | { op: 'default'; value: unknown }
  | { op: 'const'; value: unknown }
  | { op: 'toInt' } | { op: 'toFloat' } | { op: 'toString' } | { op: 'toBool' }
  | { op: 'parseDate'; from: 'unix' | 'unixMs' | 'iso' | string }
  | { op: 'formatDate'; to: 'iso' | string }
  | { op: 'coalesce'; paths: string[] }
  | { op: 'concat'; sep?: string; parts: string[] }
  | { op: 'prefix'; value: string }
  | { op: 'suffix'; value: string }
  | { op: 'lookup'; map: Record<string, unknown>; fallback?: unknown }
  | { op: 'round'; decimals?: number }
  | { op: 'multiply'; by: number };

export interface FieldMapping {
  target: string;
  source?: string;
  ops?: Op[];
  expr?: string;
}

export interface MappingSpec { fields: FieldMapping[]; }

export type PaginationSpec =
  | { style: 'none' }
  | { style: 'offset'; limit: number; limitParam?: string; offsetParam: string; totalPath?: string }
  | { style: 'page'; limit: number; limitParam?: string; pageParam: string; startPage?: number; totalPath?: string }
  | { style: 'cursor'; limit: number; limitParam?: string; cursorParam: string; cursorPath: string };

export interface RequestSpec {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  pagination: PaginationSpec;
  timeoutMs?: number;
}

export interface ResponseSpec {
  format: 'json';
  rootPath: string;
  errorPath?: string;
}

export interface ConnectorDefinition {
  request: RequestSpec;
  response: ResponseSpec;
  mapping: MappingSpec;
}

export const KIND_BY_PARAM: Record<string, ResourceKind> = {
  line: 'LINE', stop: 'STOP', direction: 'DIRECTION', nxpassage: 'NEXTPASSAGE',
};
