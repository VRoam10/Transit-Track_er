import { describe, it, expect } from 'vitest';
import { parseResponse, extractApiError } from '../src/connector/engine/parse';
import { ResponseSpec, PaginationSpec } from '../src/connector/definition.types';

const json: ResponseSpec = { format: 'json', rootPath: 'data' };
const none: PaginationSpec = { style: 'none' };

describe('parseResponse', () => {
  it('extracts items at rootPath', () => {
    const r = parseResponse({ data: [{ id: 1 }], total_count: 1 }, { ...json, rootPath: 'data' }, { style: 'offset', limit: 50, offsetParam: 'o', totalPath: 'total_count' });
    expect(r.items).toEqual([{ id: 1 }]);
    expect(r.total).toBe(1);
  });
  it('handles a bare array root', () => {
    const r = parseResponse([{ id: 1 }, { id: 2 }], { ...json, rootPath: '' }, none);
    expect(r.items.length).toBe(2);
    expect(r.total).toBeNull();
  });
  it('extracts a cursor', () => {
    const spec: PaginationSpec = { style: 'cursor', limit: 10, cursorParam: 'c', cursorPath: 'meta.next' };
    const r = parseResponse({ data: [], meta: { next: 'abc' } }, json, spec);
    expect(r.nextCursorRaw).toBe('abc');
  });
});

describe('extractApiError', () => {
  it('returns the error message when present', () => {
    expect(extractApiError({ error: 'nope' }, { ...json, errorPath: 'error' })).toBe('nope');
  });
  it('returns null when absent', () => {
    expect(extractApiError({ data: [] }, { ...json, errorPath: 'error' })).toBeNull();
  });
});
