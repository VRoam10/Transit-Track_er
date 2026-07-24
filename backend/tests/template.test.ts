import { describe, it, expect } from 'vitest';
import { extractTokens, resolveTemplate, resolveTemplateObject } from '../src/connector/engine/template';

describe('template', () => {
  it('extracts non-secret tokens only', () => {
    expect(extractTokens('a/{lineId}?k={{secret.key}}')).toEqual(['lineId']);
  });
  it('resolves tokens and secrets', () => {
    const r = resolveTemplate('/l/{id}?k={{secret.key}}', { id: 7 }, { key: 'abc' });
    expect(r.value).toBe('/l/7?k=abc');
    expect(r.missing).toEqual([]);
  });
  it('reports missing tokens', () => {
    const r = resolveTemplate('/l/{id}', {}, {});
    expect(r.missing).toEqual(['id']);
  });
  it('resolves an object of templates', () => {
    const r = resolveTemplateObject({ line: '{id}', net: 'metro' }, { id: 3 }, {});
    expect(r.value).toEqual({ line: '3', net: 'metro' });
  });
});
