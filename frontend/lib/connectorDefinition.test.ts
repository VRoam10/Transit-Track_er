import { describe, it, expect } from 'vitest';
import { complianceTargets, flattenTargetPaths, emptyDefinition, extractSourcePaths, diagnosticsByTarget } from './connectorDefinition';

describe('complianceTargets / flattenTargetPaths', () => {
  it('lists LINE targets', () => {
    expect(complianceTargets('LINE').map(t => t.name)).toEqual(['id', 'name', 'color']);
  });
  it('flattens NEXTPASSAGE nested coordonnees into dotted paths', () => {
    const paths = flattenTargetPaths('NEXTPASSAGE').map(t => t.path);
    expect(paths).toContain('coordonnees.lat');
    expect(paths).toContain('coordonnees.lon');
    expect(paths).toContain('nextTrain');
  });
});

describe('emptyDefinition', () => {
  it('is a valid blank scaffold', () => {
    const d = emptyDefinition();
    expect(d.request.method).toBe('GET');
    expect(d.request.pagination.style).toBe('none');
    expect(d.response).toEqual({ format: 'json', rootPath: '' });
    expect(d.mapping.fields).toEqual([]);
  });
});

describe('extractSourcePaths', () => {
  it('walks the first item at rootPath into dotted paths', () => {
    const raw = { data: [{ id: 1, coord: { lat: 2 } }] };
    expect(extractSourcePaths(raw, 'data').sort()).toEqual(['coord', 'coord.lat', 'id']);
  });
  it('handles a bare-array root', () => {
    expect(extractSourcePaths([{ a: 1 }], '')).toEqual(['a']);
  });
  it('returns [] when there are no items', () => {
    expect(extractSourcePaths({ data: [] }, 'data')).toEqual([]);
  });
});

describe('diagnosticsByTarget', () => {
  it('maps the first item transform + validate diags by target (worst wins)', () => {
    const diags = [{
      transform: [{ target: 'id', status: 'ok' }, { target: 'name', status: 'error', detail: 'boom' }],
      validate: [{ target: 'id', status: 'ok' }, { target: 'color', status: 'missing' }],
    }];
    const byT = diagnosticsByTarget(diags);
    expect(byT.id.status).toBe('ok');
    expect(byT.name.status).toBe('error');
    expect(byT.color.status).toBe('missing');
  });
  it('returns {} for empty diagnostics', () => {
    expect(diagnosticsByTarget([])).toEqual({});
  });
});
