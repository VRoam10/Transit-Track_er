import { ResponseSpec, PaginationSpec } from '../definition.types';
import { getPath } from './util';

export interface ParsedPage { items: any[]; total: number | null; nextCursorRaw: unknown; }

export function parseResponse(data: any, spec: ResponseSpec, pagination: PaginationSpec): ParsedPage {
  const root = getPath(data, spec.rootPath);
  const items = Array.isArray(root) ? root : root == null ? [] : [root];

  let total: number | null = null;
  if ((pagination.style === 'offset' || pagination.style === 'page') && pagination.totalPath) {
    const t = getPath(data, pagination.totalPath);
    total = typeof t === 'number' ? t : t == null ? null : Number(t);
  }

  let nextCursorRaw: unknown = null;
  if (pagination.style === 'cursor') nextCursorRaw = getPath(data, pagination.cursorPath) ?? null;

  return { items, total, nextCursorRaw };
}

export function extractApiError(data: any, spec: ResponseSpec): string | null {
  if (!spec.errorPath) return null;
  const err = getPath(data, spec.errorPath);
  if (err === null || err === undefined) return null;
  return typeof err === 'string' ? err : JSON.stringify(err);
}
