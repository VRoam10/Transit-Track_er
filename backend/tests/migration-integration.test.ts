import { describe, it, expect } from 'vitest';
import { convertResourceRow } from '../scripts/migrate-connectors';
import { runResource } from '../src/connector/engine';

describe('migration -> engine integration', () => {
  it('a migrated LINE definition normalizes a legacy-shaped response', async () => {
    const def = convertResourceRow({
      apiUrl: 'https://api.x.com/lines?offset={offset}',
      params: [],
      transformation: [
        { original: 'data.line_id', transformed: 'data.id' },
        { original: 'data.line_name', transformed: 'data.name' },
        { original: 'data.line_color', transformed: 'data.color' },
      ],
    }, 'LINE');

    const sample = { data: [{ line_id: 'M1', line_name: 'Metro 1', line_color: '#fff' }] };
    const result = await runResource(def, 'LINE', { params: { offset: '0' }, sampleResponse: sample });

    expect(result.envelope?.data[0]).toEqual({ id: 'M1', name: 'Metro 1', color: '#fff' });
  });
});
