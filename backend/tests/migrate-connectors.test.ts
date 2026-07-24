import { describe, it, expect } from 'vitest';
import { convertResourceRow } from '../scripts/migrate-connectors';

describe('convertResourceRow', () => {
  it('maps apiUrl, params, and transformation into a definition', () => {
    const def = convertResourceRow({
      apiUrl: 'https://api.x.com/lines?net={network}&offset={offset}',
      params: ['network'],
      transformation: [
        { original: 'data.line_id', transformed: 'data.id' },
        { original: 'data.line_name', transformed: 'data.name' },
      ],
    }, 'LINE');

    expect(def.request.url).toContain('{offset}');
    expect(def.request.pagination.style).toBe('none');
    expect(def.request.query).toEqual({ network: '{network}' });
    expect(def.response).toEqual({ format: 'json', rootPath: 'data' });
    expect(def.mapping.fields).toEqual([
      { target: 'data.id', source: 'data.line_id' },
      { target: 'data.name', source: 'data.line_name' },
    ]);
  });
  it('uses style none for direction too', () => {
    const def = convertResourceRow({ apiUrl: 'https://api.x.com/d', params: [], transformation: [] }, 'DIRECTION');
    expect(def.request.pagination.style).toBe('none');
  });
});
