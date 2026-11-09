import { describe, it, expect } from 'vitest';
import { applyTransformation, buildUrl, missingParams } from '../src/utils/transform';

describe('applyTransformation', () => {
  it('returns the data unchanged when there are no mappings', () => {
    const data = { a: 1 };
    expect(applyTransformation(data, [])).toBe(data);
  });

  it('renames mapped keys and drops unmapped ones', () => {
    const data = { nomcourt: 'C1', couleurligne: '#E2001A', ignored: true };
    const result = applyTransformation(data, [
      { original: 'nomcourt', transformed: 'name' },
      { original: 'couleurligne', transformed: 'color' },
    ]);
    expect(result).toEqual({ name: 'C1', color: '#E2001A' });
  });

  it('maps every element of an array and removes elements left empty', () => {
    const data = [{ id: 1 }, { other: 2 }, { id: 3 }];
    expect(applyTransformation(data, [{ original: 'id', transformed: 'lineId' }])).toEqual([
      { lineId: 1 },
      { lineId: 3 },
    ]);
  });

  it('follows dotted paths into nested objects, keeping the last segment as key', () => {
    const data = { stop: { coords: { lat: 48.1, lon: -1.6 }, name: 'Gares' } };
    const result = applyTransformation(data, [
      { original: 'stop', transformed: 'stop' },
      { original: 'stop.coords', transformed: 'position' },
      { original: 'stop.coords.lat', transformed: 'position.latitude' },
    ]);
    expect(result).toEqual({ stop: { position: { latitude: 48.1 } } });
  });

  it('drops nested objects that end up empty', () => {
    const data = { meta: { unmapped: 1 }, id: 'x' };
    const result = applyTransformation(data, [
      { original: 'meta', transformed: 'meta' },
      { original: 'id', transformed: 'id' },
    ]);
    expect(result).toEqual({ id: 'x' });
  });

  it('transforms arrays nested under a mapped key', () => {
    const data = { results: [{ nomarret: 'A' }, { nomarret: 'B' }] };
    const result = applyTransformation(data, [
      { original: 'results', transformed: 'data' },
      { original: 'results.nomarret', transformed: 'name' },
    ]);
    expect(result).toEqual({ data: [{ name: 'A' }, { name: 'B' }] });
  });
});

describe('missingParams', () => {
  it('lists params that are absent or empty', () => {
    expect(missingParams(['line', 'dir', 'stop'], { line: 'A', dir: '' })).toEqual(['dir', 'stop']);
  });

  it('treats 0 and false as provided', () => {
    expect(missingParams(['dir', 'flag'], { dir: 0, flag: false })).toEqual([]);
  });
});

describe('buildUrl', () => {
  it('replaces {param} placeholders and URL-encodes the values', () => {
    expect(buildUrl('https://api/x/{line}/stops?name={name}', ['line', 'name'], { line: 'A', name: 'Hôtel de Ville' }))
      .toBe('https://api/x/A/stops?name=H%C3%B4tel%20de%20Ville');
  });

  it('leaves placeholders untouched when the value is missing', () => {
    expect(buildUrl('https://api/{line}/{dir}', ['line', 'dir'], { line: 'B' })).toBe('https://api/B/{dir}');
  });
});
