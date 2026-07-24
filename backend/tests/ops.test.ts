import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/connector/engine/ops';

const ctx = (item: any) => ({ item });

describe('applyOps', () => {
  it('default fills null/undefined only', () => {
    expect(applyOps(undefined, [{ op: 'default', value: 'x' }], ctx({}))).toBe('x');
    expect(applyOps('y', [{ op: 'default', value: 'x' }], ctx({}))).toBe('y');
  });
  it('const ignores input', () => {
    expect(applyOps('anything', [{ op: 'const', value: 7 }], ctx({}))).toBe(7);
  });
  it('toInt / toFloat coerce', () => {
    expect(applyOps('3', [{ op: 'toInt' }], ctx({}))).toBe(3);
    expect(applyOps('3.5', [{ op: 'toFloat' }], ctx({}))).toBe(3.5);
  });
  it('parseDate unix -> ISO via formatDate', () => {
    const out = applyOps(0, [{ op: 'parseDate', from: 'unix' }, { op: 'formatDate', to: 'iso' }], ctx({}));
    expect(out).toBe('1970-01-01T00:00:00.000Z');
  });
  it('coalesce takes the first non-null item path', () => {
    expect(applyOps(null, [{ op: 'coalesce', paths: ['a', 'b'] }], ctx({ a: null, b: 'B' }))).toBe('B');
  });
  it('concat joins literals and {token} item paths', () => {
    expect(applyOps(null, [{ op: 'concat', sep: ' ', parts: ['Line', '{n}'] }], ctx({ n: 4 }))).toBe('Line 4');
  });
  it('prefix / lookup / round / multiply', () => {
    expect(applyOps('AAF', [{ op: 'prefix', value: '#' }], ctx({}))).toBe('#AAF');
    expect(applyOps('N', [{ op: 'lookup', map: { N: 0, S: 1 }, fallback: -1 }], ctx({}))).toBe(0);
    expect(applyOps('Z', [{ op: 'lookup', map: { N: 0 }, fallback: -1 }], ctx({}))).toBe(-1);
    expect(applyOps(3.14159, [{ op: 'round', decimals: 2 }], ctx({}))).toBe(3.14);
    expect(applyOps(2, [{ op: 'multiply', by: 1000 }], ctx({}))).toBe(2000);
  });
});
