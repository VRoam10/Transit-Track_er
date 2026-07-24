# Connector Flexibility Web (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the web back-office connector authoring UI to drive the Phase 1 backend engine via the `preview` endpoint, authoring the full `ConnectorDefinition` (request/response/mapping with a full ops pipeline builder + JSONata `expr`), and fix the adjacent connector-page breakages.

**Architecture:** Two small backend tweaks to `resource.routes.ts` (preview accepts an inline definition + secrets; PATCH merges secrets). Frontend: a fixed `useFetch`, a typed `connectorApi` client, a pure `connectorDefinition` helper module (vitest-tested), and a Transformer split into `RequestPanel` / `MappingPanel` / `OpEditor` / `PreviewPanel` orchestrated by a thin `Transformer`.

**Tech Stack:** Backend — Express 5, TypeScript, Prisma, vitest (existing). Frontend — Next 16, React 19, Tailwind 4, lucide-react; new dev dep: vitest.

## Global Constraints

- Backend edits are confined to `backend/src/routes/connector/resource.routes.ts` and its test; use the existing helpers (`decrypt`, `toBytes`, `resolveKind`, `loadResource`, `assertOwner`, `encryptSecrets`, `getKey`, `validateDefinition`, `requiredParams`). Do not change the engine or schema.
- Preview/PATCH stay authenticated + ownership-checked (`assertOwner`). Secrets are never returned in plaintext. Inline preview secrets are never persisted.
- The new save contract is `PATCH { name, definition, secrets }`; GET returns `{ id, connectorId, kind, name, definition, params, secrets }` (secrets masked).
- Frontend authoring calls the backend `preview` endpoint — it MUST NOT fetch the external API directly from the browser.
- Compliance target schema is a bundled frontend constant mirroring `backend/src/connector/compliance.ts` (LINE/STOP/DIRECTION/NEXTPASSAGE; NEXTPASSAGE has optional `lineId`, `coordonnees{lat?,lon?}`, `extraction?`).
- Subroute→kind map: `line→LINE, stop→STOP, direction→DIRECTION, nxpassage→NEXTPASSAGE`.
- Every UI element supports light AND dark themes (`dark:` variants on all colors), per project convention (CLAUDE.md).
- TDD for logic (backend tweaks, pure helpers): failing test first, commit after green. UI components are verified by `npx tsc --noEmit`, `npm run lint`, and (final task) `npm run build`; manual UI verification is documented in the last task and depends on the Phase 1 DB runbook having been run.
- Do not modify connector-create or `Connector.apiUrl` (dropped later by the Phase 1 runbook).

---

## File Structure

**Backend (modify):**
- `backend/src/routes/connector/resource.routes.ts` — preview (T1) + PATCH (T2) tweaks
- `backend/tests/resource.routes.test.ts` — add T1/T2 tests

**Frontend (create):**
- `frontend/vitest.config.ts` — vitest config (node env, `@` alias)
- `frontend/lib/connectorDefinition.ts` — types + `complianceTargets`/`flattenTargetPaths`/`emptyDefinition`/`extractSourcePaths`/`diagnosticsByTarget`
- `frontend/lib/connectorDefinition.test.ts` — helper tests
- `frontend/lib/connectorApi.ts` — typed API client
- `frontend/components/connector/OpEditor.tsx`
- `frontend/components/connector/RequestPanel.tsx`
- `frontend/components/connector/MappingPanel.tsx`
- `frontend/components/connector/PreviewPanel.tsx`

**Frontend (modify):**
- `frontend/hooks/useFetch.ts` — `skip` option, loading reset, AbortController
- `frontend/components/Transformer.tsx` — rewritten thin orchestrator (same import path + props `{subroute, connectorId}`)
- `frontend/components/Connectors.tsx` — delete without reload, `skip: !token`
- `frontend/components/Connector.tsx` — `skip: !token`
- `frontend/package.json` — vitest dev dep + `test` scripts

---

## Task B1: Preview accepts an inline definition + secrets

**Files:**
- Modify: `backend/src/routes/connector/resource.routes.ts:82-95` (the preview handler)
- Test: `backend/tests/resource.routes.test.ts`

**Interfaces:**
- Consumes: `loadResource`, `assertOwner`, `resolveKind`, `decrypt`, `validateDefinition`, `runResource` (all existing)
- Produces: `POST /:kind/preview` now honors `req.body.definition` and `req.body.secrets`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/resource.routes.test.ts` (the file already mocks `../src/lib/prisma`, `../src/middleware/auth`, and sets `CONNECTOR_SECRET_KEY`; it exposes `prisma.connectorResource.findUnique`, `prisma.connector.findFirst`, and an `app()` helper mounting `createConnectorResourceRouter()` at `/api/connector/:connectorId`):

```ts
describe('preview inline definition', () => {
  beforeEach(() => vi.clearAllMocks());

  const inlineDef = {
    request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'none' } },
    response: { format: 'json', rootPath: 'items' },
    mapping: { fields: [{ target: 'id', source: 'a', ops: [{ op: 'toString' }] }] },
  };

  it('runs the inline definition instead of the stored one', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue({
      connectorId: 'c1', kind: 'LINE', name: 'L', secrets: null,
      definition: { request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'none' } },
        response: { format: 'json', rootPath: 'data' }, mapping: { fields: [{ target: 'id', source: 'a' }] } },
    });
    const res = await request(app())
      .post('/api/connector/c1/line/preview')
      .send({ definition: inlineDef, sampleResponse: { items: [{ a: 1 }], data: [{ a: 2 }] } });
    expect(res.status).toBe(200);
    expect(res.body.envelope.data[0]).toEqual({ id: '1' }); // from `items` (inline), not `data` (stored)
  });

  it('previews a not-yet-saved resource (stored row null) with an inline definition', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue(null);
    const res = await request(app())
      .post('/api/connector/c1/line/preview')
      .send({ definition: inlineDef, sampleResponse: { items: [{ a: 5 }] } });
    expect(res.status).toBe(200);
    expect(res.body.envelope.data[0]).toEqual({ id: '5' });
  });

  it('rejects a malformed inline definition with 422', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue(null);
    const res = await request(app())
      .post('/api/connector/c1/line/preview')
      .send({ definition: { request: {} } });
    expect(res.status).toBe(422);
  });

  it('404s a non-owner', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue(null);
    const res = await request(app())
      .post('/api/connector/c1/line/preview')
      .send({ definition: inlineDef, sampleResponse: { items: [] } });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- resource.routes` (from `backend/`)
Expected: FAIL — the new inline-definition test gets the stored `data` result / 404 on null row (current handler 404s when the row is missing and ignores `body.definition`).

- [ ] **Step 3: Implement the preview change**

Replace the preview handler body (`resource.routes.ts:82-95`) with:

```ts
  // Preview / dry-run (authenticated). Accepts an inline definition + secrets so
  // the back-office can test unsaved edits (and connectors not yet saved).
  router.post('/:kind/preview', authenticateToken, async (req: Request, res: Response) => {
    const kind = resolveKind(req, res); if (!kind) return;
    if (!(await assertOwner(req, res))) return;
    const row = await loadResource(req.params.connectorId, kind);
    const definition = (req.body.definition ?? row?.definition) as ConnectorDefinition | undefined;
    if (!definition) return res.status(404).json({ error: 'No definition to preview' });
    if (req.body.definition) {
      const errors = validateDefinition(req.body.definition);
      if (errors.length) return res.status(422).json({ errors });
    }
    const stored = row?.secrets ? decrypt(row.secrets as Buffer) : {};
    const secrets = { ...stored, ...(req.body.secrets ?? {}) };
    const result = await runResource(definition, kind, {
      params: req.body.params ?? {},
      page: req.body.page,
      secrets,
      sampleResponse: req.body.sampleResponse,
    });
    res.json({ ok: result.ok, stage: result.stage, message: result.message, raw: result.raw, envelope: result.envelope, diagnostics: result.diagnostics });
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- resource.routes`
Expected: PASS. Then `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/connector/resource.routes.ts backend/tests/resource.routes.test.ts
git commit -m "feat: preview accepts inline definition + secrets for unsaved edits"
```

---

## Task B2: PATCH merges secrets instead of replacing

**Files:**
- Modify: `backend/src/routes/connector/resource.routes.ts:57-72` (the PATCH handler)
- Test: `backend/tests/resource.routes.test.ts`

**Interfaces:**
- Consumes: `loadResource`, `decrypt`, `encryptSecrets`, `toBytes`, `getKey` (existing)
- Produces: PATCH merges `req.body.secrets` over stored secrets (string sets, `null` deletes, omitted preserves)

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/resource.routes.test.ts` (import `encryptSecrets`/`decryptSecrets` from `../src/connector/engine/secrets` at the top of the file if not already imported; `KEY` = `Buffer.from(process.env.CONNECTOR_SECRET_KEY!, 'base64')`):

```ts
import { encryptSecrets, decryptSecrets } from '../src/connector/engine/secrets';

describe('PATCH merges secrets', () => {
  beforeEach(() => vi.clearAllMocks());
  const KEY = Buffer.from(process.env.CONNECTOR_SECRET_KEY!, 'base64');
  const goodDef = { request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'none' } },
    response: { format: 'json', rootPath: 'data' }, mapping: { fields: [{ target: 'id', source: 'a' }] } };

  function capturedSecrets(): Buffer | null {
    const call = (prisma.connectorResource.upsert as any).mock.calls[0][0];
    const val = call.update.secrets;
    return val == null ? null : Buffer.from(val);
  }

  it('merges a new secret while preserving existing ones', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ connectorId: 'c1', kind: 'LINE', secrets: encryptSecrets({ apiKey: 'A' }, KEY) });
    (prisma.connectorResource.upsert as any).mockResolvedValue({ id: 'r1', kind: 'LINE', name: 'L' });
    await request(app()).patch('/api/connector/c1/line').send({ name: 'L', definition: goodDef, secrets: { token: 'B' } });
    expect(decryptSecrets(capturedSecrets()!, KEY)).toEqual({ apiKey: 'A', token: 'B' });
  });

  it('deletes a secret when its value is null', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ connectorId: 'c1', kind: 'LINE', secrets: encryptSecrets({ apiKey: 'A', token: 'B' }, KEY) });
    (prisma.connectorResource.upsert as any).mockResolvedValue({ id: 'r1', kind: 'LINE', name: 'L' });
    await request(app()).patch('/api/connector/c1/line').send({ name: 'L', definition: goodDef, secrets: { token: null } });
    expect(decryptSecrets(capturedSecrets()!, KEY)).toEqual({ apiKey: 'A' });
  });

  it('leaves secrets untouched when body.secrets is omitted', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ connectorId: 'c1', kind: 'LINE', secrets: encryptSecrets({ apiKey: 'A' }, KEY) });
    (prisma.connectorResource.upsert as any).mockResolvedValue({ id: 'r1', kind: 'LINE', name: 'L' });
    await request(app()).patch('/api/connector/c1/line').send({ name: 'L', definition: goodDef });
    const call = (prisma.connectorResource.upsert as any).mock.calls[0][0];
    expect('secrets' in call.update).toBe(false);
  });

  it('stores null when the merge empties the map', async () => {
    (prisma.connector.findFirst as any).mockResolvedValue({ id: 'c1' });
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ connectorId: 'c1', kind: 'LINE', secrets: encryptSecrets({ apiKey: 'A' }, KEY) });
    (prisma.connectorResource.upsert as any).mockResolvedValue({ id: 'r1', kind: 'LINE', name: 'L' });
    await request(app()).patch('/api/connector/c1/line').send({ name: 'L', definition: goodDef, secrets: { apiKey: null } });
    expect(capturedSecrets()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- resource.routes`
Expected: FAIL — current PATCH replaces (loses `apiKey`) / ignores `null` semantics / calls `encryptSecrets({token:'B'})` only.

- [ ] **Step 3: Implement the PATCH change**

Replace the PATCH handler body (`resource.routes.ts:58-72`) with:

```ts
  router.patch('/:kind', authenticateToken, async (req: Request, res: Response) => {
    const kind = resolveKind(req, res); if (!kind) return;
    if (!(await assertOwner(req, res))) return;
    const { name, definition, secrets } = req.body;
    const errors = validateDefinition(definition);
    if (errors.length) return res.status(422).json({ errors });

    const existingRow = await loadResource(req.params.connectorId, kind);
    let secretsBytes: Uint8Array<ArrayBuffer> | null | undefined = undefined; // undefined = leave unchanged
    if (secrets !== undefined) {
      const merged: Record<string, string> = existingRow?.secrets ? decrypt(existingRow.secrets as Buffer) : {};
      for (const [k, v] of Object.entries(secrets as Record<string, string | null>)) {
        if (v === null) delete merged[k];
        else merged[k] = v;
      }
      secretsBytes = Object.keys(merged).length ? toBytes(encryptSecrets(merged, getKey())) : null;
    }

    const row = await prisma.connectorResource.upsert({
      where: { connectorId_kind: { connectorId: req.params.connectorId, kind } },
      update: { name, definition, ...(secretsBytes !== undefined ? { secrets: secretsBytes } : {}) },
      create: { connectorId: req.params.connectorId, kind, name: name ?? '', definition, secrets: secretsBytes ?? undefined },
    });
    res.json({ id: row.id, kind: row.kind, name: row.name });
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- resource.routes` then `npm test` (full backend suite) and `npx tsc --noEmit`.
Expected: all PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/connector/resource.routes.ts backend/tests/resource.routes.test.ts
git commit -m "feat: PATCH merges connector secrets (null deletes, omitted preserves)"
```

---

## Task F1: Frontend test tooling

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`, `frontend/lib/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (in `frontend/`) runs vitest over `frontend/lib/**/*.test.ts`

- [ ] **Step 1: Install vitest**

Run (in `frontend/`): `npm install -D vitest`

- [ ] **Step 2: Add scripts to `frontend/package.json`**

Add to `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname) } },
});
```

- [ ] **Step 4: Create `frontend/lib/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
describe('frontend tooling', () => { it('runs', () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 5: Run and commit**

Run: `npm test` → 1 passed.
```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/lib/smoke.test.ts
git commit -m "build: add vitest to frontend for connector helper tests"
```

---

## Task F2: connectorDefinition — types + pure helpers

**Files:**
- Create: `frontend/lib/connectorDefinition.ts`, `frontend/lib/connectorDefinition.test.ts`

**Interfaces:**
- Produces (consumed by F3–F8):
  - Types: `ResourceKind`, `Op`, `FieldMapping`, `MappingSpec`, `PaginationSpec`, `RequestSpec`, `ResponseSpec`, `ConnectorDefinition`, `TargetField`, `TargetDiag`
  - `KIND_BY_SUBROUTE: Record<string, ResourceKind>`
  - `complianceTargets(kind: ResourceKind): TargetField[]`
  - `flattenTargetPaths(kind: ResourceKind): { path: string; type: string; optional: boolean }[]`
  - `emptyDefinition(): ConnectorDefinition`
  - `extractSourcePaths(raw: unknown, rootPath: string): string[]`
  - `diagnosticsByTarget(diagnostics: any[]): Record<string, TargetDiag>`

- [ ] **Step 1: Write the failing tests**

`frontend/lib/connectorDefinition.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- connectorDefinition`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `frontend/lib/connectorDefinition.ts`**

```ts
export type ResourceKind = 'LINE' | 'STOP' | 'DIRECTION' | 'NEXTPASSAGE';

export type Op =
  | { op: 'default'; value: unknown } | { op: 'const'; value: unknown }
  | { op: 'toInt' } | { op: 'toFloat' } | { op: 'toString' } | { op: 'toBool' }
  | { op: 'parseDate'; from: string } | { op: 'formatDate'; to: string }
  | { op: 'coalesce'; paths: string[] } | { op: 'concat'; sep?: string; parts: string[] }
  | { op: 'prefix'; value: string } | { op: 'suffix'; value: string }
  | { op: 'lookup'; map: Record<string, unknown>; fallback?: unknown }
  | { op: 'round'; decimals?: number } | { op: 'multiply'; by: number };

export interface FieldMapping { target: string; source?: string; ops?: Op[]; expr?: string; }
export interface MappingSpec { fields: FieldMapping[]; }
export type PaginationSpec =
  | { style: 'none' }
  | { style: 'offset'; limit: number; limitParam?: string; offsetParam: string; totalPath?: string }
  | { style: 'page'; limit: number; limitParam?: string; pageParam: string; startPage?: number; totalPath?: string }
  | { style: 'cursor'; limit: number; limitParam?: string; cursorParam: string; cursorPath: string };
export interface RequestSpec {
  method: 'GET' | 'POST'; url: string;
  headers?: Record<string, string>; query?: Record<string, string>; body?: unknown;
  pagination: PaginationSpec; timeoutMs?: number;
}
export interface ResponseSpec { format: 'json'; rootPath: string; errorPath?: string; }
export interface ConnectorDefinition { request: RequestSpec; response: ResponseSpec; mapping: MappingSpec; }

export const KIND_BY_SUBROUTE: Record<string, ResourceKind> = {
  line: 'LINE', stop: 'STOP', direction: 'DIRECTION', nxpassage: 'NEXTPASSAGE',
};

export type TargetType = 'String' | 'Int' | 'Float' | 'Datetime' | 'Boolean';
export interface TargetField { name: string; type?: TargetType; optional?: boolean; children?: TargetField[]; }

const TARGETS: Record<ResourceKind, TargetField[]> = {
  LINE: [{ name: 'id', type: 'String' }, { name: 'name', type: 'String' }, { name: 'color', type: 'String' }],
  STOP: [{ name: 'id', type: 'String' }, { name: 'name', type: 'String' }, { name: 'direction', type: 'Int' }, { name: 'order', type: 'Int' }],
  DIRECTION: [{ name: 'id', type: 'Int' }, { name: 'name', type: 'String' }, { name: 'parcoursId', type: 'String' }],
  NEXTPASSAGE: [
    { name: 'id', type: 'String' }, { name: 'lineId', type: 'String', optional: true },
    { name: 'name', type: 'String' }, { name: 'direction', type: 'Int' }, { name: 'nextTrain', type: 'Datetime' },
    { name: 'coordonnees', optional: true, children: [{ name: 'lat', type: 'Float', optional: true }, { name: 'lon', type: 'Float', optional: true }] },
    { name: 'extraction', type: 'Datetime', optional: true },
  ],
};

export function complianceTargets(kind: ResourceKind): TargetField[] { return TARGETS[kind]; }

export function flattenTargetPaths(kind: ResourceKind): { path: string; type: string; optional: boolean }[] {
  const out: { path: string; type: string; optional: boolean }[] = [];
  const walk = (fields: TargetField[], prefix: string) => {
    for (const f of fields) {
      const path = prefix ? `${prefix}.${f.name}` : f.name;
      if (f.children) walk(f.children, path);
      else out.push({ path, type: f.type ?? 'String', optional: !!f.optional });
    }
  };
  walk(TARGETS[kind], '');
  return out;
}

export function emptyDefinition(): ConnectorDefinition {
  return {
    request: { method: 'GET', url: '', headers: {}, query: {}, pagination: { style: 'none' } },
    response: { format: 'json', rootPath: '' },
    mapping: { fields: [] },
  };
}

function getPath(obj: any, path: string): unknown {
  if (path === '') return obj;
  return path.split('.').reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

export function extractSourcePaths(raw: unknown, rootPath: string): string[] {
  const root = getPath(raw, rootPath);
  const item = Array.isArray(root) ? root[0] : root;
  if (item == null || typeof item !== 'object') return [];
  const out: string[] = [];
  const walk = (obj: any, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.push(path);
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path);
    }
  };
  walk(item, '');
  return out;
}

export type TargetDiag = { status: 'ok' | 'missing' | 'wrongType' | 'error'; detail?: string };
const RANK: Record<TargetDiag['status'], number> = { ok: 0, missing: 2, wrongType: 2, error: 3 };

export function diagnosticsByTarget(diagnostics: any[]): Record<string, TargetDiag> {
  const out: Record<string, TargetDiag> = {};
  const first = diagnostics?.[0];
  if (!first) return out;
  const apply = (target: string, status: TargetDiag['status'], detail?: string) => {
    if (!out[target] || RANK[status] > RANK[out[target].status]) out[target] = { status, detail };
  };
  for (const d of first.transform ?? []) apply(d.target, d.status, d.detail);
  for (const d of first.validate ?? []) apply(d.target, d.status);
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- connectorDefinition` then `npm test`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/connectorDefinition.ts frontend/lib/connectorDefinition.test.ts
git commit -m "feat: add connector definition types + pure helpers (frontend)"
```

---

## Task F3: Fix useFetch + add connectorApi client

**Files:**
- Modify: `frontend/hooks/useFetch.ts`
- Create: `frontend/lib/connectorApi.ts`

**Interfaces:**
- Consumes: `ConnectorDefinition` (F2)
- Produces:
  - `useFetch<T>(endpoint, { token?, method?, body?, skip? })` → `{ data, loading, error }`
  - `connectorApi`: `getResource`, `saveResource`, `previewResource`, `deleteResource`, `listConnectors`, `getConnector`

No unit test (I/O + React hook; the spec scopes vitest to pure helpers). Verify by `npx tsc --noEmit` + `npm run lint`; behavior exercised by later tasks + manual.

- [ ] **Step 1: Rewrite `frontend/hooks/useFetch.ts`**

```ts
import { useEffect, useState } from 'react';

interface UseFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
  skip?: boolean;
}

export function useFetch<T>(endpoint: string, options: UseFetchOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.skip) return;
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.token && { Authorization: `Bearer ${options.token}` }),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.error ? `Error: ${result.error}` : `Error: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result); setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'An error occurred'); setData(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [endpoint, options.token, options.skip]);

  return { data, loading, error };
}
```

- [ ] **Step 2: Create `frontend/lib/connectorApi.ts`**

```ts
import { ConnectorDefinition } from './connectorDefinition';

const base = () => process.env.NEXT_PUBLIC_API_URL ?? '';
const auth = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    if (Array.isArray(body?.errors)) throw new Error(body.errors.join('; '));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export interface ResourceRecord {
  id: string; connectorId: string; kind: string; name: string;
  definition: ConnectorDefinition; params: string[]; secrets: Record<string, string>;
}
export interface PreviewResult {
  ok: boolean; stage?: string; message?: string; raw?: any;
  envelope?: { total_count: number; data: any[]; pagination: { next: string | number | null } };
  diagnostics?: any[];
}

export const connectorApi = {
  getResource: (connectorId: string, subroute: string, token: string): Promise<ResourceRecord> =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}`, { headers: auth(token) }).then(handle),
  saveResource: (connectorId: string, subroute: string, body: { name: string; definition: ConnectorDefinition; secrets?: Record<string, string | null> }, token: string) =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}`, { method: 'PATCH', headers: auth(token), body: JSON.stringify(body) }).then(handle),
  previewResource: (connectorId: string, subroute: string, body: { definition?: ConnectorDefinition; secrets?: Record<string, string>; params?: Record<string, any>; page?: any; sampleResponse?: any }, token: string): Promise<PreviewResult> =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}/preview`, { method: 'POST', headers: auth(token), body: JSON.stringify(body) }).then(handle),
  deleteResource: (connectorId: string, subroute: string, token: string) =>
    fetch(`${base()}/api/connector/${connectorId}/${subroute}`, { method: 'DELETE', headers: auth(token) }).then(handle),
  listConnectors: (token: string) =>
    fetch(`${base()}/api/connector`, { headers: auth(token) }).then(handle),
  getConnector: (id: string, token: string) =>
    fetch(`${base()}/api/connector/${id}`, { headers: auth(token) }).then(handle),
};
```

- [ ] **Step 3: Verify**

Run (in `frontend/`): `npx tsc --noEmit` and `npm run lint`.
Expected: no type errors; lint clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/hooks/useFetch.ts frontend/lib/connectorApi.ts
git commit -m "fix: guard useFetch double-fetch + add typed connector API client"
```

---

## Task F4: OpEditor component

**Files:**
- Create: `frontend/components/connector/OpEditor.tsx`

**Interfaces:**
- Consumes: `Op` (F2)
- Produces: `<OpEditor op={op} onChange={(op:Op)=>void} />` default export

**Behavior spec (no unit test — verify with `tsc`/`lint`; follow the Tailwind + `dark:` patterns from the old `Transformer.tsx`):**
- `'use client'`. Renders a compact inline editor whose fields depend on `op.op`:
  - `default`/`const`: one text input → `{ ...op, value }` (raw string; keep as string).
  - `toInt`/`toFloat`/`toString`/`toBool`: no inputs (label only).
  - `parseDate`: text input for `from` (placeholder `unix | unixMs | iso | DD/MM/YYYY`).
  - `formatDate`: text input for `to` (placeholder `iso | YYYY-MM-DD`).
  - `coalesce`: a comma-separated text input parsed to `paths: string[]`.
  - `concat`: a `sep` input + a comma-separated `parts` input.
  - `prefix`/`suffix`: one `value` input.
  - `lookup`: a small key/value rows editor building `map`, plus a `fallback` input.
  - `round`: number input → `decimals`.
  - `multiply`: number input → `by`.
- Every change calls `onChange` with a NEW op object (immutable update). No internal persistence.

- [ ] **Step 1: Implement `OpEditor.tsx`** per the spec above (typed on `Op`; a `switch (op.op)` returning the right inputs).
- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint` clean.
- [ ] **Step 3: Commit** — `git add frontend/components/connector/OpEditor.tsx && git commit -m "feat: add OpEditor for connector transform ops"`

---

## Task F5: RequestPanel component

**Files:**
- Create: `frontend/components/connector/RequestPanel.tsx`

**Interfaces:**
- Consumes: `RequestSpec`, `PaginationSpec` (F2)
- Produces: `<RequestPanel request={RequestSpec} secrets={Record<string,string|null>} secretNames={string[]} onRequestChange={(r:RequestSpec)=>void} onSecretsChange={(s:Record<string,string|null>)=>void} />`

**Behavior spec (no unit test; Tailwind + `dark:`, reuse the card styling from the old `Transformer.tsx`):**
- `'use client'`. Controlled: renders from `request`/`secrets`; every edit emits a new object via the callbacks (immutable).
- Fields: method `<select>` (GET/POST); url text input; headers key/value rows (add/remove) → `request.headers`; query key/value rows → `request.query`; `timeoutMs` number input.
- Pagination: a style `<select>` (none/offset/page/cursor). When style changes, reset to a valid shape for that style (e.g. offset → `{ style:'offset', limit:50, offsetParam:'offset' }`). Show style-specific inputs: offset→`offsetParam`,`limit`,`limitParam?`,`totalPath?`; page→`pageParam`,`startPage?`,`limit`,`limitParam?`,`totalPath?`; cursor→`cursorParam`,`cursorPath`,`limit`,`limitParam?`.
- Secrets editor: list `secretNames` (existing keys) each with a masked placeholder and an input to set a new value (writing sets `secrets[name]=value`) and a delete button (sets `secrets[name]=null`); an "add secret" row (key + value) adds to `secrets`. `secrets` is the draft of CHANGES only (name→newValue, or null to delete); unchanged existing keys stay absent from `secrets`.

- [ ] **Step 1: Implement `RequestPanel.tsx`** per spec.
- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`.
- [ ] **Step 3: Commit** — `git commit -m "feat: add RequestPanel (method/url/headers/query/pagination/secrets)"`

---

## Task F6: MappingPanel component

**Files:**
- Create: `frontend/components/connector/MappingPanel.tsx`

**Interfaces:**
- Consumes: `MappingSpec`, `FieldMapping`, `Op`, `ResourceKind`, `flattenTargetPaths`, `TargetDiag` (F2); `OpEditor` (F4)
- Produces: `<MappingPanel kind={ResourceKind} mapping={MappingSpec} sourcePaths={string[]} diagnostics={Record<string,TargetDiag>} onChange={(m:MappingSpec)=>void} />`

**Behavior spec (no unit test; Tailwind + `dark:`):**
- `'use client'`. One row per `flattenTargetPaths(kind)` entry (target path + expected type + optional badge). The row's `FieldMapping` is `mapping.fields.find(f => f.target === path)` (or a blank one). Editing a row rebuilds `mapping.fields` immutably (replace or insert the field for that target; drop fields whose target isn't a known path).
- Each row has an **"advanced (expr)"** toggle:
  - OFF: a `source` input with `list=` a shared `<datalist>` of `sourcePaths`; below it, an ops pipeline — a list of `<OpEditor>` (each with remove + move up/down buttons) and an "add op" menu (select op type → append a default-shaped op of that type). Clears any `expr`.
  - ON: a `<textarea>` for `expr` (JSONata). Clears `source`/`ops`.
- Show the per-target diagnostic badge from `diagnostics[path]` (ok=green, missing/wrongType=amber/red, error=red, with `detail` as a tooltip/subtext).
- Adding a default-shaped op means: `default→{op:'default',value:''}`, `parseDate→{op:'parseDate',from:'unix'}`, `formatDate→{op:'formatDate',to:'iso'}`, `coalesce→{op:'coalesce',paths:[]}`, `concat→{op:'concat',parts:[]}`, `lookup→{op:'lookup',map:{}}`, `round→{op:'round',decimals:0}`, `multiply→{op:'multiply',by:1}`, `prefix/suffix→{op,value:''}`, and the no-arg ops as `{op}`.

- [ ] **Step 1: Implement `MappingPanel.tsx`** per spec.
- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`.
- [ ] **Step 3: Commit** — `git commit -m "feat: add MappingPanel with ops pipeline builder + expr toggle"`

---

## Task F7: PreviewPanel component

**Files:**
- Create: `frontend/components/connector/PreviewPanel.tsx`

**Interfaces:**
- Consumes: `connectorApi.previewResource`, `PreviewResult` (F3); `ConnectorDefinition` (F2)
- Produces: `<PreviewPanel connectorId subroute token definition testParams secrets onTestParamsChange onResult={(r:PreviewResult)=>void} />`

**Behavior spec (no unit test; Tailwind + `dark:`):**
- `'use client'`. A "Test" button calls `connectorApi.previewResource(connectorId, subroute, { definition, secrets, params: testParams }, token)`; local `loading`/`result`/`error` state.
- A small key/value editor for `testParams` (canonical params to send, e.g. `lineId`). The parent owns `testParams` and passes `onTestParamsChange` so Save/Test share them.
- On result: if `!ok`, show `stage` + `message` in a red card. Always render `raw` (JSON `<pre>`, scroll-capped) and `envelope` (JSON `<pre>`); call `onResult(result)` so the parent can derive source-path suggestions (from `result.raw`) and diagnostics (from `result.diagnostics`). Show a diagnostics summary count (ok/problem).
- Errors thrown by `previewResource` shown in a red card.

- [ ] **Step 1: Implement `PreviewPanel.tsx`** per spec (props: `connectorId`, `subroute`, `token`, `definition`, `secrets`, `testParams`, `onTestParamsChange`, `onResult`).
- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`.
- [ ] **Step 3: Commit** — `git commit -m "feat: add PreviewPanel calling backend preview endpoint"`

---

## Task F8: Transformer orchestrator rewrite

**Files:**
- Modify (rewrite): `frontend/components/Transformer.tsx`

**Interfaces:**
- Consumes: `useFetch` (F3), `connectorApi` (F3), `connectorDefinition` helpers (F2), `RequestPanel` (F5), `MappingPanel` (F6), `PreviewPanel` (F7), `KIND_BY_SUBROUTE`
- Produces: default export `Transformer({ subroute, connectorId })` (unchanged prop signature — pages already pass these)

**Behavior spec (no unit test; Tailwind + `dark:`; keep the same `ml-64 flex-1` layout wrapper as the old component):**
- `'use client'`. Read `token` from `localStorage` in an effect (redirect to `/` if absent), as today.
- `kind = KIND_BY_SUBROUTE[subroute]`.
- Hydrate: `useFetch<ResourceRecord>(\`/api/connector/${connectorId}/${subroute}\`, { token, skip: !token })`. On data: seed `definition` draft from `data.definition`, `secretNames` from `Object.keys(data.secrets)`. If the GET 404s (no resource yet), start from `emptyDefinition()` (treat a 404 error as "new resource", not a hard error).
- State: `definition` (draft `ConnectorDefinition`), `secrets` (draft changes `Record<string,string|null>`, starts `{}`), `secretNames` (existing keys), `testParams` (`Record<string,string>`), `previewResult` (last `PreviewResult` from `onResult`), `saving`, `saveMessage`.
- Derive `sourcePaths = extractSourcePaths(previewResult?.raw, definition.response.rootPath)` and `diagnostics = diagnosticsByTarget(previewResult?.diagnostics ?? [])` (both from F2). `PreviewPanel`'s `onResult` sets `previewResult`.
- Layout: `RequestPanel` (request + secrets), `MappingPanel` (mapping + sourcePaths + diagnostics), `PreviewPanel` (test), and a Save button.
- **Save:** `connectorApi.saveResource(connectorId, subroute, { name: subroute, definition, secrets }, token)`; on success show a success message and clear the `secrets` draft (changes persisted) + refresh `secretNames`; on 422 show the joined validation errors.
- All state updates immutable.

- [ ] **Step 1: Rewrite `Transformer.tsx`** per spec (replace the whole file; keep the loading/redirect guard and the outer `<main className='ml-64 flex-1 ...'>` wrapper).
- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`.
- [ ] **Step 3: Commit** — `git commit -m "feat: rebuild Transformer as preview-driven definition authoring"`

---

## Task F9: Adjacent page fixes + full build

**Files:**
- Modify: `frontend/components/Connectors.tsx`, `frontend/components/Connector.tsx`

**Interfaces:**
- Consumes: `useFetch` `skip` option (F3); `connectorApi.listConnectors` optional

**Behavior spec (no unit test):**
- `Connectors.tsx`: pass `{ token, skip: !token }` to `useFetch`. Replace `handleDelete`'s `window.location.reload()` with local state: keep a local `items` state seeded from `data` (sync via effect), and on successful delete remove the row from `items` (setItems(items.filter(c => c.id !== id))) instead of reloading. Render from `items`.
- `Connector.tsx`: pass `{ token, skip: !token }` to `useFetch`. (Leave the `apiUrl` display as-is — that column still exists until the Phase 1 runbook drops it.)

- [ ] **Step 1: Edit `Connectors.tsx`** — add `skip: !token`; introduce `items` state + effect sync; delete updates `items`.
- [ ] **Step 2: Edit `Connector.tsx`** — add `skip: !token`.
- [ ] **Step 3: Verify build** — `npx tsc --noEmit`, `npm run lint`, and `npm run build` (full Next build) all succeed.
- [ ] **Step 4: Commit** — `git commit -m "fix: connector list/detail double-fetch + delete without full reload"`

- [ ] **Step 5: Manual verification (requires the Phase 1 DB runbook to have been run: Postgres up, migrations applied, CONNECTOR_SECRET_KEY set, at least one connector migrated or created)**

Run backend (`npm run dev` in `backend/`) and frontend (`npm run dev` in `frontend/`). In the back-office: open a connector's Lines page; fill request (a real transit API URL), click Test → confirm raw + transformed envelope + diagnostics render; build a mapping (source + an op, and one field via expr); Test again → diagnostics update; add a secret, Save → reload page → secret shows masked and persists; edit and Save again → confirm other secrets aren't lost. Confirm no direct browser fetch to the external API (all traffic goes to the backend `/preview`). Verify light and dark themes.

---

## Notes for the executor

- The backend tasks (B1, B2) and frontend logic tasks (F1, F2) are TDD and DB-free (mocked prisma / pure helpers). The UI tasks (F3–F9) are verified by `tsc`/`lint`/`build`; runtime UI verification (F9 Step 5) needs the full stack and the Phase 1 DB runbook.
- Keep the `Transformer` import path (`@/components/Transformer`) and its `{ subroute, connectorId }` props unchanged — the four sub-resource pages already import it that way.
