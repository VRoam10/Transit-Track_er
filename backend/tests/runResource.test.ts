import { describe, it, expect } from 'vitest';
import { runResource } from '../src/connector/engine';
import { ConnectorDefinition } from '../src/connector/definition.types';

const lineDef: ConnectorDefinition = {
  request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'offset', limit: 2, offsetParam: 'o', totalPath: 'total_count' } },
  response: { format: 'json', rootPath: 'data' },
  mapping: { fields: [
    { target: 'id', source: 'lid', ops: [{ op: 'toString' }] },
    { target: 'name', source: 'lname' },
    { target: 'color', source: 'lcolor', ops: [{ op: 'default', value: '#000' }] },
  ] },
};

describe('runResource', () => {
  it('normalizes a sample response and validates', async () => {
    const sample = { total_count: 3, data: [{ lid: 1, lname: 'A', lcolor: '#fff' }, { lid: 2, lname: 'B' }] };
    const r = await runResource(lineDef, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: sample });
    expect(r.ok).toBe(true);
    expect(r.envelope!.total_count).toBe(3);
    expect(r.envelope!.data[0]).toEqual({ id: '1', name: 'A', color: '#fff' });
    expect(r.envelope!.data[1].color).toBe('#000');
    expect(r.envelope!.pagination.next).toBe(2); // offset 0 + 2 items, more remain
  });
  it('returns next=null when the last page is short', async () => {
    const sample = { total_count: 1, data: [{ lid: 1, lname: 'A', lcolor: '#fff' }] };
    const r = await runResource(lineDef, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: sample });
    expect(r.envelope!.pagination.next).toBeNull();
  });
  it('reports request-stage failure on a missing token', async () => {
    const def = { ...lineDef, request: { ...lineDef.request, url: 'https://api.x.com/{lineId}' } };
    const r = await runResource(def, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: {} });
    expect(r.ok).toBe(false);
    expect(r.stage).toBe('request');
  });
  it('reports parse-stage failure on an API error envelope', async () => {
    const def = { ...lineDef, response: { ...lineDef.response, errorPath: 'error' } };
    const r = await runResource(def, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: { error: 'bad key' } });
    expect(r.ok).toBe(false);
    expect(r.stage).toBe('parse');
    expect(r.message).toContain('bad key');
  });
});
