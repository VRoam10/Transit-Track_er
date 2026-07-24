import { describe, it, expect } from 'vitest';
import { validateItem } from '../src/connector/engine/validate';

describe('validateItem', () => {
  it('passes a well-formed line', () => {
    const d = validateItem({ id: 'M1', name: 'Metro 1', color: '#fff' }, 'LINE');
    expect(d.every(x => x.status === 'ok')).toBe(true);
  });
  it('flags a missing required field', () => {
    const d = validateItem({ id: 'M1', name: 'Metro 1' }, 'LINE');
    expect(d.find(x => x.target === 'color')?.status).toBe('missing');
  });
  it('flags a wrong type', () => {
    const d = validateItem({ id: 'S1', name: 'Stop', direction: 'north', order: 1 }, 'STOP');
    expect(d.find(x => x.target === 'direction')?.status).toBe('wrongType');
  });
  it('allows an omitted optional field', () => {
    const d = validateItem({ id: 'x', name: 'n', direction: 0, nextTrain: '2020-01-01T00:00:00.000Z' }, 'NEXTPASSAGE');
    expect(d.find(x => x.target === 'coordonnees')?.status).toBe('ok');
  });
});
