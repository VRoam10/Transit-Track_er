import { describe, it, expect } from 'vitest';
import { transformItem } from '../src/connector/engine/transform';

describe('transformItem', () => {
  it('maps a source path with ops', async () => {
    const r = await transformItem({ line_name: 'A' }, { fields: [
      { target: 'name', source: 'line_name', ops: [{ op: 'default', value: 'Unknown' }] },
    ] });
    expect(r.item).toEqual({ name: 'A' });
    expect(r.diags[0].status).toBe('ok');
  });
  it('flags a missing source', async () => {
    const r = await transformItem({}, { fields: [{ target: 'name', source: 'line_name' }] });
    expect(r.diags[0].status).toBe('missing');
  });
  it('builds nested output via dotted target', async () => {
    const r = await transformItem({ la: 48.8 }, { fields: [{ target: 'coordonnees.lat', source: 'la' }] });
    expect(r.item).toEqual({ coordonnees: { lat: 48.8 } });
  });
  it('evaluates a JSONata expr', async () => {
    const r = await transformItem({ departure: 0 }, { fields: [{ target: 'nextTrain', expr: '$fromMillis(departure * 1000)' }] });
    expect(r.item.nextTrain).toBe('1970-01-01T00:00:00.000Z');
  });
  it('records an error for a bad expr', async () => {
    const r = await transformItem({}, { fields: [{ target: 'x', expr: '1 +' }] }); // syntax error
    expect(r.diags[0].status).toBe('error');
  });
});
