import { describe, it, expect } from 'vitest';
import { getPath, setPath } from '../src/connector/engine/util';

describe('getPath', () => {
  it('returns the whole object for empty path', () => {
    expect(getPath({ a: 1 }, '')).toEqual({ a: 1 });
  });
  it('reads a nested value', () => {
    expect(getPath({ a: { b: { c: 5 } } }, 'a.b.c')).toBe(5);
  });
  it('returns undefined for a missing path', () => {
    expect(getPath({ a: {} }, 'a.b.c')).toBeUndefined();
  });
});

describe('setPath', () => {
  it('sets a flat key', () => {
    const o: any = {}; setPath(o, 'x', 1); expect(o).toEqual({ x: 1 });
  });
  it('builds nested structure', () => {
    const o: any = {}; setPath(o, 'coordonnees.lat', 48.8);
    expect(o).toEqual({ coordonnees: { lat: 48.8 } });
  });
});
