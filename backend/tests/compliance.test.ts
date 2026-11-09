import { describe, it, expect } from 'vitest';
import { complianceFor } from '../src/connector/compliance';

describe('complianceFor', () => {
  it('describes the line schema', () => {
    const fields = complianceFor('LINE');
    expect(fields.map(f => f.name)).toEqual(['id', 'name', 'color']);
  });
  it('describes nested coordonnees for nxpassage', () => {
    const fields = complianceFor('NEXTPASSAGE');
    const coord = fields.find(f => f.name === 'coordonnees');
    expect(coord && 'object' in coord).toBe(true);
    expect((coord as any).optional).toBe(true);
  });
});
