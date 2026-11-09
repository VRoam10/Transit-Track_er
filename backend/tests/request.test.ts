import { describe, it, expect } from 'vitest';
import { buildRequest } from '../src/connector/engine/request';
import { ConnectorDefinition } from '../src/connector/definition.types';

const base: ConnectorDefinition = {
  request: {
    method: 'GET',
    url: 'https://api.x.com/lines',
    headers: { Authorization: 'Bearer {{secret.key}}' },
    query: { line: '{lineId}' },
    pagination: { style: 'offset', limit: 50, offsetParam: 'start' },
  },
  response: { format: 'json', rootPath: 'data' },
  mapping: { fields: [] },
};

describe('buildRequest', () => {
  it('templates query + headers and adds pagination params', () => {
    const r = buildRequest(base, { lineId: '4' }, { key: 'abc' }, { offset: 100 });
    expect(r.headers.Authorization).toBe('Bearer abc');
    expect(r.url).toContain('line=4');
    expect(r.url).toContain('start=100');
    expect(r.url).toContain('limit=50');
    expect(r.missing).toEqual([]);
  });
  it('reports missing tokens', () => {
    const r = buildRequest(base, {}, {}, { offset: 0 });
    expect(r.missing).toContain('lineId');
  });
  it('omits pagination params for style none', () => {
    const def = { ...base, request: { ...base.request, pagination: { style: 'none' as const } } };
    const r = buildRequest(def, { lineId: '4' }, { key: 'abc' }, {});
    expect(r.url).not.toContain('start=');
  });
});
