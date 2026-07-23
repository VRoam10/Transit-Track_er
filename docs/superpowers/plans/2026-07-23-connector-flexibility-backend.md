# Connector Flexibility Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rigid whitelist-and-rename connector model with a configurable definition engine that adapts to real-world transit APIs (auth/headers/pagination, response-shape variety, value transformation) and validates connectors before they go live.

**Architecture:** One `ConnectorDefinition` JSON (request + response + mapping) per resource, stored in a consolidated `ConnectorResource` table, executed by a generic pipeline (`resolveSecrets → buildRequest → fetch → parseResponse → transform → validate → respond`). Transformation is hybrid: typed ops for common cases plus a sandboxed JSONata `expr` escape hatch. A preview endpoint runs the same pipeline and returns diagnostics.

**Tech Stack:** Node/Express 5, TypeScript, Prisma (PostgreSQL), axios, moment (already present); new: `jsonata` (runtime), `vitest` + `supertest` (dev/test).

## Global Constraints

- Backend compiles to ES2020 / CommonJS (`tsconfig.json` unchanged).
- Only `response.format: 'json'` is implemented; the field must accept future values without schema change.
- The normalized output envelope is exactly `{ total_count: number, data: any[], pagination: { next: string | number | null } }`. The item key MUST stay `data` (deployed mobile reads `body['data']`).
- Deployed mobile must keep working: the resource CRUD `GET` response MUST still expose a `params: string[]` field, and the proxy MUST accept the same query params the current app sends.
- Secrets are never returned in plaintext (masked as `"***"`); encryption is AES-256-GCM with the key from env `CONNECTOR_SECRET_KEY` (base64 of 32 bytes).
- TDD: write the failing test first for every unit; commit after every green step.
- URL param placeholders use `{token}`; secret references use `{{secret.name}}`.
- Resource kind URL segments: `line | stop | direction | nxpassage` ↔ enum `LINE | STOP | DIRECTION | NEXTPASSAGE`.

---

## File Structure

**Create (source):**
- `backend/src/lib/prisma.ts` — shared PrismaClient singleton
- `backend/src/connector/definition.types.ts` — `ConnectorDefinition` and sub-types
- `backend/src/connector/compliance.ts` — normalized-schema constants + `complianceFor(kind)`
- `backend/src/connector/engine/util.ts` — `getPath` / `setPath`
- `backend/src/connector/engine/ops.ts` — typed-op library `applyOps`
- `backend/src/connector/engine/template.ts` — `resolveTemplate*`, `extractTokens`
- `backend/src/connector/engine/secrets.ts` — encrypt/decrypt/mask + `getKey`
- `backend/src/connector/engine/parse.ts` — `parseResponse`, `extractApiError`
- `backend/src/connector/engine/transform.ts` — `transformItem`
- `backend/src/connector/engine/validate.ts` — `validateItem`
- `backend/src/connector/engine/request.ts` — `buildRequest`
- `backend/src/connector/engine/fetch.ts` — `assertPublicUrl`, `executeRequest`
- `backend/src/connector/engine/index.ts` — `runResource`
- `backend/src/connector/definition.schema.ts` — `validateDefinition`, `requiredParams`
- `backend/src/routes/connector/resource.routes.ts` — generic CRUD + preview + proxy
- `backend/scripts/migrate-connectors.ts` — data migration script + `convertResourceRow`

**Modify:**
- `backend/package.json` — deps + `test` scripts
- `backend/prisma/schema.prisma` — add `ConnectorResource` + enum; trim `Connector`
- `backend/src/routes/connector/mainRouter.ts` — mount generic router, remove old sub-routers

**Create (tests):** `backend/tests/**/*.test.ts` (one per module, see tasks)
**Create (config):** `backend/vitest.config.ts`

---

## Task 1: Test tooling and dependencies

**Files:**
- Modify: `backend/package.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs vitest over `backend/tests/**/*.test.ts`

- [ ] **Step 1: Install dependencies**

Run (in `backend/`):
```bash
npm install jsonata
npm install -D vitest supertest @types/supertest
```
Expected: `package.json` gains `jsonata` under dependencies and `vitest`, `supertest`, `@types/supertest` under devDependencies.

- [ ] **Step 2: Add test scripts**

In `backend/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

`backend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write a smoke test**

`backend/tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('tooling', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/vitest.config.ts backend/tests/smoke.test.ts
git commit -m "build: add vitest + jsonata for connector engine"
```

---

## Task 2: Definition types, path utilities, compliance schema

**Files:**
- Create: `backend/src/connector/definition.types.ts`
- Create: `backend/src/connector/engine/util.ts`
- Create: `backend/src/connector/compliance.ts`
- Test: `backend/tests/util.test.ts`, `backend/tests/compliance.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ResourceKind = 'LINE'|'STOP'|'DIRECTION'|'NEXTPASSAGE'`
  - `ConnectorDefinition`, `RequestSpec`, `PaginationSpec`, `ResponseSpec`, `MappingSpec`, `FieldMapping`, `Op`
  - `getPath(obj: any, path: string): unknown`
  - `setPath(obj: Record<string, any>, path: string, value: unknown): void`
  - `ComplianceField`, `complianceFor(kind: ResourceKind): ComplianceField[]`

- [ ] **Step 1: Write the types file**

`backend/src/connector/definition.types.ts`:
```ts
export type ResourceKind = 'LINE' | 'STOP' | 'DIRECTION' | 'NEXTPASSAGE';

export type Op =
  | { op: 'default'; value: unknown }
  | { op: 'const'; value: unknown }
  | { op: 'toInt' } | { op: 'toFloat' } | { op: 'toString' } | { op: 'toBool' }
  | { op: 'parseDate'; from: 'unix' | 'unixMs' | 'iso' | string }
  | { op: 'formatDate'; to: 'iso' | string }
  | { op: 'coalesce'; paths: string[] }
  | { op: 'concat'; sep?: string; parts: string[] }
  | { op: 'prefix'; value: string }
  | { op: 'suffix'; value: string }
  | { op: 'lookup'; map: Record<string, unknown>; fallback?: unknown }
  | { op: 'round'; decimals?: number }
  | { op: 'multiply'; by: number };

export interface FieldMapping {
  target: string;
  source?: string;
  ops?: Op[];
  expr?: string;
}

export interface MappingSpec { fields: FieldMapping[]; }

export type PaginationSpec =
  | { style: 'none' }
  | { style: 'offset'; limit: number; limitParam?: string; offsetParam: string; totalPath?: string }
  | { style: 'page'; limit: number; limitParam?: string; pageParam: string; startPage?: number; totalPath?: string }
  | { style: 'cursor'; limit: number; limitParam?: string; cursorParam: string; cursorPath: string };

export interface RequestSpec {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  pagination: PaginationSpec;
  timeoutMs?: number;
}

export interface ResponseSpec {
  format: 'json';
  rootPath: string;
  errorPath?: string;
}

export interface ConnectorDefinition {
  request: RequestSpec;
  response: ResponseSpec;
  mapping: MappingSpec;
}

export const KIND_BY_PARAM: Record<string, ResourceKind> = {
  line: 'LINE', stop: 'STOP', direction: 'DIRECTION', nxpassage: 'NEXTPASSAGE',
};
```

- [ ] **Step 2: Write the failing test for path utilities**

`backend/tests/util.test.ts`:
```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- util`
Expected: FAIL — cannot find module `util` / `getPath is not a function`.

- [ ] **Step 4: Implement the path utilities**

`backend/src/connector/engine/util.ts`:
```ts
export function getPath(obj: any, path: string): unknown {
  if (path === '') return obj;
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setPath(obj: Record<string, any>, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}
```

- [ ] **Step 5: Write the failing test for compliance**

`backend/tests/compliance.test.ts`:
```ts
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
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- compliance`
Expected: FAIL — cannot find module `compliance`.

- [ ] **Step 7: Implement compliance constants**

`backend/src/connector/compliance.ts` (values copied from `src/routes/connector/compliance.routes.ts`):
```ts
import { ResourceKind } from './definition.types';

export type ComplianceField =
  | { name: string; type: 'String' | 'Int' | 'Float' | 'Datetime' | 'Boolean'; optional?: boolean }
  | { name: string; object: ComplianceField[]; optional?: boolean };

const SCHEMAS: Record<ResourceKind, ComplianceField[]> = {
  LINE: [
    { name: 'id', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'color', type: 'String' },
  ],
  STOP: [
    { name: 'id', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'direction', type: 'Int' },
    { name: 'order', type: 'Int' },
  ],
  DIRECTION: [
    { name: 'id', type: 'Int' },
    { name: 'name', type: 'String' },
    { name: 'parcoursId', type: 'String' },
  ],
  NEXTPASSAGE: [
    { name: 'id', type: 'String' },
    { name: 'lineId', type: 'String', optional: true },
    { name: 'name', type: 'String' },
    { name: 'direction', type: 'Int' },
    { name: 'nextTrain', type: 'Datetime' },
    { name: 'coordonnees', optional: true, object: [
      { name: 'lat', type: 'Float', optional: true },
      { name: 'lon', type: 'Float', optional: true },
    ] },
    { name: 'extraction', type: 'Datetime', optional: true },
  ],
};

export function complianceFor(kind: ResourceKind): ComplianceField[] {
  return SCHEMAS[kind];
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- util compliance`
Expected: PASS — all green.

- [ ] **Step 9: Commit**

```bash
git add backend/src/connector/definition.types.ts backend/src/connector/engine/util.ts backend/src/connector/compliance.ts backend/tests/util.test.ts backend/tests/compliance.test.ts
git commit -m "feat: add connector definition types, path utils, compliance schema"
```

---

## Task 3: Typed-op library

**Files:**
- Create: `backend/src/connector/engine/ops.ts`
- Test: `backend/tests/ops.test.ts`

**Interfaces:**
- Consumes: `Op` (Task 2), `getPath` (Task 2)
- Produces: `applyOps(value: unknown, ops: Op[], ctx: { item: Record<string, any> }): unknown`

- [ ] **Step 1: Write the failing tests**

`backend/tests/ops.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ops`
Expected: FAIL — cannot find module `ops`.

- [ ] **Step 3: Implement the op library**

`backend/src/connector/engine/ops.ts`:
```ts
import moment from 'moment';
import { Op } from '../definition.types';
import { getPath } from './util';

export interface OpContext { item: Record<string, any>; }

function fill(parts: string[], item: Record<string, any>): string {
  return parts
    .map(p => {
      const m = /^\{(.+)\}$/.exec(p);
      return m ? String(getPath(item, m[1]) ?? '') : p;
    })
    .join('');
}

export function applyOps(value: unknown, ops: Op[] | undefined, ctx: OpContext): unknown {
  let v = value;
  for (const op of ops ?? []) {
    switch (op.op) {
      case 'default': if (v === null || v === undefined) v = op.value; break;
      case 'const': v = op.value; break;
      case 'toInt': v = v === null || v === undefined ? v : parseInt(String(v), 10); break;
      case 'toFloat': v = v === null || v === undefined ? v : parseFloat(String(v)); break;
      case 'toString': v = v === null || v === undefined ? v : String(v); break;
      case 'toBool': v = v === 'false' ? false : Boolean(v); break;
      case 'parseDate': {
        if (v === null || v === undefined) break;
        if (op.from === 'unix') v = moment.unix(Number(v));
        else if (op.from === 'unixMs') v = moment(Number(v));
        else if (op.from === 'iso') v = moment(String(v), moment.ISO_8601);
        else v = moment(String(v), op.from);
        break;
      }
      case 'formatDate': {
        const m = moment.isMoment(v) ? v : moment(v as any);
        v = op.to === 'iso' ? m.toISOString() : m.format(op.to);
        break;
      }
      case 'coalesce': {
        const found = op.paths.map(p => getPath(ctx.item, p)).find(x => x !== null && x !== undefined);
        v = found === undefined ? v : found;
        break;
      }
      case 'concat': v = fill(op.parts, ctx.item); if (op.sep) v = op.parts.map(p => fill([p], ctx.item)).join(op.sep); break;
      case 'prefix': v = `${op.value}${v ?? ''}`; break;
      case 'suffix': v = `${v ?? ''}${op.value}`; break;
      case 'lookup': v = Object.prototype.hasOwnProperty.call(op.map, String(v)) ? op.map[String(v)] : op.fallback; break;
      case 'round': { const f = Math.pow(10, op.decimals ?? 0); v = Math.round(Number(v) * f) / f; break; }
      case 'multiply': v = Number(v) * op.by; break;
    }
  }
  return v;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ops`
Expected: PASS — all green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/ops.ts backend/tests/ops.test.ts
git commit -m "feat: add typed transformation op library"
```

---

## Task 4: Template resolution

**Files:**
- Create: `backend/src/connector/engine/template.ts`
- Test: `backend/tests/template.test.ts`

**Interfaces:**
- Consumes: `getPath` is not needed here
- Produces:
  - `extractTokens(str: string): string[]`
  - `resolveTemplate(input: string, tokens: Record<string, any>, secrets: Record<string, string>): { value: string; missing: string[] }`
  - `resolveTemplateObject(obj: Record<string, string> | undefined, tokens, secrets): { value: Record<string, string>; missing: string[] }`

- [ ] **Step 1: Write the failing tests**

`backend/tests/template.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- template`
Expected: FAIL — cannot find module `template`.

- [ ] **Step 3: Implement template resolution**

`backend/src/connector/engine/template.ts`:
```ts
const SECRET_RE = /\{\{secret\.([a-zA-Z0-9_]+)\}\}/g;
const TOKEN_RE = /\{([a-zA-Z0-9_.]+)\}/g;

export function extractTokens(str: string): string[] {
  const withoutSecrets = str.replace(SECRET_RE, '');
  const tokens = new Set<string>();
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(withoutSecrets)) !== null) tokens.add(m[1]);
  return [...tokens];
}

export function resolveTemplate(
  input: string,
  tokens: Record<string, any>,
  secrets: Record<string, string>,
): { value: string; missing: string[] } {
  const missing: string[] = [];
  const withSecrets = input.replace(SECRET_RE, (_full, name) => {
    if (secrets[name] === undefined) { missing.push(`secret.${name}`); return ''; }
    return secrets[name];
  });
  const value = withSecrets.replace(TOKEN_RE, (_full, name) => {
    const v = tokens[name];
    if (v === undefined || v === '') { missing.push(name); return ''; }
    return String(v);
  });
  return { value, missing };
}

export function resolveTemplateObject(
  obj: Record<string, string> | undefined,
  tokens: Record<string, any>,
  secrets: Record<string, string>,
): { value: Record<string, string>; missing: string[] } {
  const value: Record<string, string> = {};
  const missing: string[] = [];
  for (const [k, tmpl] of Object.entries(obj ?? {})) {
    const r = resolveTemplate(tmpl, tokens, secrets);
    value[k] = r.value;
    missing.push(...r.missing);
  }
  return { value, missing };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- template`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/template.ts backend/tests/template.test.ts
git commit -m "feat: add template + token resolution for connector requests"
```

---

## Task 5: Secret encryption

**Files:**
- Create: `backend/src/connector/engine/secrets.ts`
- Test: `backend/tests/secrets.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `encryptSecrets(map: Record<string, string>, key: Buffer): Buffer`
  - `decryptSecrets(blob: Buffer, key: Buffer): Record<string, string>`
  - `maskSecrets(blob: Buffer | null, key: Buffer): Record<string, '***'>`
  - `getKey(): Buffer`

- [ ] **Step 1: Write the failing tests**

`backend/tests/secrets.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { encryptSecrets, decryptSecrets, maskSecrets } from '../src/connector/engine/secrets';

const KEY = Buffer.alloc(32, 7);

describe('secrets', () => {
  it('round-trips an encrypted map', () => {
    const blob = encryptSecrets({ apiKey: 's3cr3t' }, KEY);
    expect(Buffer.isBuffer(blob)).toBe(true);
    expect(decryptSecrets(blob, KEY)).toEqual({ apiKey: 's3cr3t' });
  });
  it('masks values but keeps names', () => {
    const blob = encryptSecrets({ apiKey: 's3cr3t', token: 'x' }, KEY);
    expect(maskSecrets(blob, KEY)).toEqual({ apiKey: '***', token: '***' });
  });
  it('masks null blob to empty object', () => {
    expect(maskSecrets(null, KEY)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- secrets`
Expected: FAIL — cannot find module `secrets`.

- [ ] **Step 3: Implement secret encryption**

`backend/src/connector/engine/secrets.ts`:
```ts
import crypto from 'crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptSecrets(map: Record<string, string>, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(map), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptSecrets(blob: Buffer, key: Buffer): Record<string, string> {
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

export function maskSecrets(blob: Buffer | null, key: Buffer): Record<string, '***'> {
  if (!blob) return {};
  const map = decryptSecrets(blob, key);
  return Object.fromEntries(Object.keys(map).map(k => [k, '***'])) as Record<string, '***'>;
}

export function getKey(): Buffer {
  const raw = process.env.CONNECTOR_SECRET_KEY;
  if (!raw) throw new Error('CONNECTOR_SECRET_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('CONNECTOR_SECRET_KEY must be 32 bytes (base64)');
  return key;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- secrets`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/secrets.ts backend/tests/secrets.test.ts
git commit -m "feat: add AES-256-GCM secret storage for connectors"
```

---

## Task 6: Response parsing

**Files:**
- Create: `backend/src/connector/engine/parse.ts`
- Test: `backend/tests/parse.test.ts`

**Interfaces:**
- Consumes: `getPath` (Task 2), `ResponseSpec`, `PaginationSpec` (Task 2)
- Produces:
  - `interface ParsedPage { items: any[]; total: number | null; nextCursorRaw: unknown }`
  - `parseResponse(data: any, spec: ResponseSpec, pagination: PaginationSpec): ParsedPage`
  - `extractApiError(data: any, spec: ResponseSpec): string | null`

- [ ] **Step 1: Write the failing tests**

`backend/tests/parse.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseResponse, extractApiError } from '../src/connector/engine/parse';
import { ResponseSpec, PaginationSpec } from '../src/connector/definition.types';

const json: ResponseSpec = { format: 'json', rootPath: 'data' };
const none: PaginationSpec = { style: 'none' };

describe('parseResponse', () => {
  it('extracts items at rootPath', () => {
    const r = parseResponse({ data: [{ id: 1 }], total_count: 1 }, { ...json, rootPath: 'data' }, { style: 'offset', limit: 50, offsetParam: 'o', totalPath: 'total_count' });
    expect(r.items).toEqual([{ id: 1 }]);
    expect(r.total).toBe(1);
  });
  it('handles a bare array root', () => {
    const r = parseResponse([{ id: 1 }, { id: 2 }], { ...json, rootPath: '' }, none);
    expect(r.items.length).toBe(2);
    expect(r.total).toBeNull();
  });
  it('extracts a cursor', () => {
    const spec: PaginationSpec = { style: 'cursor', limit: 10, cursorParam: 'c', cursorPath: 'meta.next' };
    const r = parseResponse({ data: [], meta: { next: 'abc' } }, json, spec);
    expect(r.nextCursorRaw).toBe('abc');
  });
});

describe('extractApiError', () => {
  it('returns the error message when present', () => {
    expect(extractApiError({ error: 'nope' }, { ...json, errorPath: 'error' })).toBe('nope');
  });
  it('returns null when absent', () => {
    expect(extractApiError({ data: [] }, { ...json, errorPath: 'error' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- parse`
Expected: FAIL — cannot find module `parse`.

- [ ] **Step 3: Implement parsing**

`backend/src/connector/engine/parse.ts`:
```ts
import { ResponseSpec, PaginationSpec } from '../definition.types';
import { getPath } from './util';

export interface ParsedPage { items: any[]; total: number | null; nextCursorRaw: unknown; }

export function parseResponse(data: any, spec: ResponseSpec, pagination: PaginationSpec): ParsedPage {
  const root = getPath(data, spec.rootPath);
  const items = Array.isArray(root) ? root : root == null ? [] : [root];

  let total: number | null = null;
  if ((pagination.style === 'offset' || pagination.style === 'page') && pagination.totalPath) {
    const t = getPath(data, pagination.totalPath);
    total = typeof t === 'number' ? t : t == null ? null : Number(t);
  }

  let nextCursorRaw: unknown = null;
  if (pagination.style === 'cursor') nextCursorRaw = getPath(data, pagination.cursorPath) ?? null;

  return { items, total, nextCursorRaw };
}

export function extractApiError(data: any, spec: ResponseSpec): string | null {
  if (!spec.errorPath) return null;
  const err = getPath(data, spec.errorPath);
  if (err === null || err === undefined) return null;
  return typeof err === 'string' ? err : JSON.stringify(err);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- parse`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/parse.ts backend/tests/parse.test.ts
git commit -m "feat: add response parsing with rootPath + pagination extraction"
```

---

## Task 7: Item transformation (ops + JSONata)

**Files:**
- Create: `backend/src/connector/engine/transform.ts`
- Test: `backend/tests/transform.test.ts`

**Interfaces:**
- Consumes: `applyOps` (Task 3), `getPath`/`setPath` (Task 2), `MappingSpec` (Task 2), `jsonata`
- Produces:
  - `interface FieldDiag { target: string; status: 'ok' | 'missing' | 'error'; detail?: string }`
  - `interface ItemResult { item: Record<string, any>; diags: FieldDiag[] }`
  - `transformItem(raw: Record<string, any>, mapping: MappingSpec): Promise<ItemResult>`

- [ ] **Step 1: Write the failing tests**

`backend/tests/transform.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- transform`
Expected: FAIL — cannot find module `transform`.

- [ ] **Step 3: Implement transformation**

`backend/src/connector/engine/transform.ts`:
```ts
import jsonata from 'jsonata';
import { MappingSpec } from '../definition.types';
import { applyOps } from './ops';
import { getPath, setPath } from './util';

export interface FieldDiag { target: string; status: 'ok' | 'missing' | 'error'; detail?: string; }
export interface ItemResult { item: Record<string, any>; diags: FieldDiag[]; }

export async function transformItem(raw: Record<string, any>, mapping: MappingSpec): Promise<ItemResult> {
  const item: Record<string, any> = {};
  const diags: FieldDiag[] = [];

  for (const field of mapping.fields) {
    try {
      let value: unknown;
      if (field.expr) {
        value = await jsonata(field.expr).evaluate(raw);
      } else {
        const base = field.source ? getPath(raw, field.source) : undefined;
        value = applyOps(base, field.ops, { item: raw });
      }
      if (value === undefined || value === null) {
        diags.push({ target: field.target, status: 'missing', detail: field.source ? `source '${field.source}' not found in item` : 'produced no value' });
      } else {
        setPath(item, field.target, value);
        diags.push({ target: field.target, status: 'ok' });
      }
    } catch (e: any) {
      diags.push({ target: field.target, status: 'error', detail: String(e?.message ?? e) });
    }
  }

  return { item, diags };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- transform`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/transform.ts backend/tests/transform.test.ts
git commit -m "feat: add per-item transformation with ops and JSONata escape hatch"
```

---

## Task 8: Compliance validation

**Files:**
- Create: `backend/src/connector/engine/validate.ts`
- Test: `backend/tests/validate.test.ts`

**Interfaces:**
- Consumes: `complianceFor` + `ComplianceField` (Task 2), `getPath` (Task 2), `ResourceKind` (Task 2)
- Produces:
  - `interface ValidationFieldDiag { target: string; status: 'ok' | 'missing' | 'wrongType'; expected?: string; got?: string }`
  - `validateItem(item: Record<string, any>, kind: ResourceKind): ValidationFieldDiag[]`

- [ ] **Step 1: Write the failing tests**

`backend/tests/validate.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- validate`
Expected: FAIL — cannot find module `validate`.

- [ ] **Step 3: Implement validation**

`backend/src/connector/engine/validate.ts`:
```ts
import { complianceFor, ComplianceField } from '../compliance';
import { ResourceKind } from '../definition.types';

export interface ValidationFieldDiag {
  target: string;
  status: 'ok' | 'missing' | 'wrongType';
  expected?: string;
  got?: string;
}

function typeOk(type: string, value: any): boolean {
  switch (type) {
    case 'String': return typeof value === 'string';
    case 'Int': return typeof value === 'number' && Number.isInteger(value);
    case 'Float': return typeof value === 'number';
    case 'Boolean': return typeof value === 'boolean';
    case 'Datetime': return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    default: return false;
  }
}

function checkField(prefix: string, field: ComplianceField, container: any, out: ValidationFieldDiag[]) {
  const target = prefix ? `${prefix}.${field.name}` : field.name;
  const value = container == null ? undefined : container[field.name];
  if (value === undefined || value === null) {
    out.push({ target, status: field.optional ? 'ok' : 'missing' });
    return;
  }
  if ('object' in field) {
    out.push({ target, status: 'ok' });
    for (const sub of field.object) checkField(target, sub, value, out);
  } else if (typeOk(field.type, value)) {
    out.push({ target, status: 'ok' });
  } else {
    out.push({ target, status: 'wrongType', expected: field.type, got: typeof value });
  }
}

export function validateItem(item: Record<string, any>, kind: ResourceKind): ValidationFieldDiag[] {
  const out: ValidationFieldDiag[] = [];
  for (const field of complianceFor(kind)) checkField('', field, item, out);
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/validate.ts backend/tests/validate.test.ts
git commit -m "feat: add compliance validation with per-field diagnostics"
```

---

## Task 9: Request builder

**Files:**
- Create: `backend/src/connector/engine/request.ts`
- Test: `backend/tests/request.test.ts`

**Interfaces:**
- Consumes: `resolveTemplate`/`resolveTemplateObject` (Task 4), `ConnectorDefinition`/`PaginationSpec` (Task 2)
- Produces:
  - `interface PageCursor { offset?: number; page?: number; cursor?: string }`
  - `interface BuiltRequest { method: 'GET' | 'POST'; url: string; headers: Record<string, string>; body: unknown; timeoutMs: number; missing: string[] }`
  - `buildRequest(def: ConnectorDefinition, params: Record<string, any>, secrets: Record<string, string>, page: PageCursor): BuiltRequest`

- [ ] **Step 1: Write the failing tests**

`backend/tests/request.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildRequest } from '../src/connector/engine/request';
import { ConnectorDefinition } from '../src/connector/definition.types';

const base: ConnectorDefinition = {
  request: {
    method: 'GET',
    url: 'https://api.x.com/lines',
    headers: { Authorization: 'Bearer {{secret.key}}' },
    query: { line: '{lineId}' },
    pagination: { style: 'offset', limit: 50, offsetParam: 'start' },
  },
  response: { format: 'json', rootPath: 'data' },
  mapping: { fields: [] },
};

describe('buildRequest', () => {
  it('templates query + headers and adds pagination params', () => {
    const r = buildRequest(base, { lineId: '4' }, { key: 'abc' }, { offset: 100 });
    expect(r.headers.Authorization).toBe('Bearer abc');
    expect(r.url).toContain('line=4');
    expect(r.url).toContain('start=100');
    expect(r.url).toContain('limit=50');
    expect(r.missing).toEqual([]);
  });
  it('reports missing tokens', () => {
    const r = buildRequest(base, {}, {}, { offset: 0 });
    expect(r.missing).toContain('lineId');
  });
  it('omits pagination params for style none', () => {
    const def = { ...base, request: { ...base.request, pagination: { style: 'none' as const } } };
    const r = buildRequest(def, { lineId: '4' }, { key: 'abc' }, {});
    expect(r.url).not.toContain('start=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- request`
Expected: FAIL — cannot find module `request`.

- [ ] **Step 3: Implement the request builder**

`backend/src/connector/engine/request.ts`:
```ts
import { ConnectorDefinition } from '../definition.types';
import { resolveTemplate, resolveTemplateObject } from './template';

export interface PageCursor { offset?: number; page?: number; cursor?: string; }

export interface BuiltRequest {
  method: 'GET' | 'POST';
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  missing: string[];
}

export function buildRequest(
  def: ConnectorDefinition,
  params: Record<string, any>,
  secrets: Record<string, string>,
  page: PageCursor,
): BuiltRequest {
  const { request } = def;
  const missing: string[] = [];

  const urlR = resolveTemplate(request.url, params, secrets);
  missing.push(...urlR.missing);
  const url = new URL(urlR.value);

  const queryR = resolveTemplateObject(request.query, params, secrets);
  missing.push(...queryR.missing);
  for (const [k, v] of Object.entries(queryR.value)) url.searchParams.set(k, v);

  const p = request.pagination;
  if (p.style === 'offset') {
    url.searchParams.set(p.offsetParam, String(page.offset ?? 0));
    if (p.limitParam) url.searchParams.set(p.limitParam, String(p.limit));
    else url.searchParams.set('limit', String(p.limit));
  } else if (p.style === 'page') {
    url.searchParams.set(p.pageParam, String(page.page ?? p.startPage ?? 1));
    if (p.limitParam) url.searchParams.set(p.limitParam, String(p.limit));
    else url.searchParams.set('limit', String(p.limit));
  } else if (p.style === 'cursor') {
    if (page.cursor) url.searchParams.set(p.cursorParam, page.cursor);
    if (p.limitParam) url.searchParams.set(p.limitParam, String(p.limit));
  }

  const headersR = resolveTemplateObject(request.headers, params, secrets);
  missing.push(...headersR.missing);

  let body: unknown = request.body ?? null;
  if (request.method === 'POST' && typeof request.body === 'string') {
    const bodyR = resolveTemplate(request.body, params, secrets);
    missing.push(...bodyR.missing);
    body = bodyR.value;
  }

  return {
    method: request.method,
    url: url.toString(),
    headers: headersR.value,
    body,
    timeoutMs: request.timeoutMs ?? 8000,
    missing,
  };
}
```

Note: the test's `limit=50` assertion relies on the default `limit` param name when `limitParam` is absent.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- request`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/request.ts backend/tests/request.test.ts
git commit -m "feat: add request builder with templating and pagination params"
```

---

## Task 10: Fetch with SSRF guard and retry

**Files:**
- Create: `backend/src/connector/engine/fetch.ts`
- Test: `backend/tests/fetch.test.ts`

**Interfaces:**
- Consumes: `BuiltRequest` (Task 9)
- Produces:
  - `assertPublicUrl(url: string): void` (throws on private/loopback/non-http(s))
  - `executeRequest(req: BuiltRequest): Promise<{ status: number; data: any }>`

- [ ] **Step 1: Write the failing tests**

`backend/tests/fetch.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { assertPublicUrl } from '../src/connector/engine/fetch';

describe('assertPublicUrl', () => {
  it('allows a public https host', () => {
    expect(() => assertPublicUrl('https://api.example.com/x')).not.toThrow();
  });
  it('rejects non-http(s)', () => {
    expect(() => assertPublicUrl('file:///etc/passwd')).toThrow();
  });
  it('rejects loopback', () => {
    expect(() => assertPublicUrl('http://127.0.0.1/x')).toThrow();
    expect(() => assertPublicUrl('http://localhost/x')).toThrow();
  });
  it('rejects private ranges', () => {
    expect(() => assertPublicUrl('http://10.0.0.5/x')).toThrow();
    expect(() => assertPublicUrl('http://192.168.1.2/x')).toThrow();
    expect(() => assertPublicUrl('http://169.254.1.1/x')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fetch`
Expected: FAIL — cannot find module `fetch`.

- [ ] **Step 3: Implement fetch + guard**

`backend/src/connector/engine/fetch.ts`:
```ts
import axios from 'axios';
import http from 'http';
import https from 'https';
import { BuiltRequest } from './request';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const client = axios.create({ httpAgent, httpsAgent, validateStatus: () => true });

function isPrivateIp(host: string): boolean {
  if (host === 'localhost') return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function assertPublicUrl(url: string): void {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Blocked scheme: ${parsed.protocol}`);
  }
  if (isPrivateIp(parsed.hostname) || parsed.hostname === '::1' || parsed.hostname === '[::1]') {
    throw new Error(`Blocked private host: ${parsed.hostname}`);
  }
}

export async function executeRequest(req: BuiltRequest): Promise<{ status: number; data: any }> {
  assertPublicUrl(req.url);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.request({
        method: req.method,
        url: req.url,
        headers: req.headers,
        data: req.method === 'POST' ? req.body : undefined,
        timeout: req.timeoutMs,
      });
      if (res.status >= 500 && attempt === 0) { lastErr = new Error(`Upstream ${res.status}`); continue; }
      return { status: res.status, data: res.data };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Request failed');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- fetch`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/connector/engine/fetch.ts backend/tests/fetch.test.ts
git commit -m "feat: add external fetch with SSRF guard, keep-alive, and retry"
```

---

## Task 11: runResource orchestrator

**Files:**
- Create: `backend/src/connector/engine/index.ts`
- Test: `backend/tests/runResource.test.ts`

**Interfaces:**
- Consumes: `buildRequest`/`PageCursor` (Task 9), `executeRequest` (Task 10), `parseResponse`/`extractApiError` (Task 6), `transformItem` (Task 7), `validateItem` (Task 8), definition types (Task 2)
- Produces:
  - `interface NormalizedEnvelope { total_count: number; data: any[]; pagination: { next: string | number | null } }`
  - `interface RunResult { ok: boolean; stage?: string; message?: string; raw?: any; envelope?: NormalizedEnvelope; diagnostics?: any[] }`
  - `interface RunParams { params: Record<string, any>; page?: PageCursor; secrets?: Record<string, string>; sampleResponse?: any }`
  - `runResource(def: ConnectorDefinition, kind: ResourceKind, run: RunParams): Promise<RunResult>`

- [ ] **Step 1: Write the failing tests (fetch mocked via sampleResponse)**

`backend/tests/runResource.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { runResource } from '../src/connector/engine';
import { ConnectorDefinition } from '../src/connector/definition.types';

const lineDef: ConnectorDefinition = {
  request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'offset', limit: 2, offsetParam: 'o', totalPath: 'total_count' } },
  response: { format: 'json', rootPath: 'data' },
  mapping: { fields: [
    { target: 'id', source: 'lid', ops: [{ op: 'toString' }] },
    { target: 'name', source: 'lname' },
    { target: 'color', source: 'lcolor', ops: [{ op: 'default', value: '#000' }] },
  ] },
};

describe('runResource', () => {
  it('normalizes a sample response and validates', async () => {
    const sample = { total_count: 3, data: [{ lid: 1, lname: 'A', lcolor: '#fff' }, { lid: 2, lname: 'B' }] };
    const r = await runResource(lineDef, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: sample });
    expect(r.ok).toBe(true);
    expect(r.envelope!.total_count).toBe(3);
    expect(r.envelope!.data[0]).toEqual({ id: '1', name: 'A', color: '#fff' });
    expect(r.envelope!.data[1].color).toBe('#000');
    expect(r.envelope!.pagination.next).toBe(2); // offset 0 + 2 items, more remain
  });
  it('returns next=null when the last page is short', async () => {
    const sample = { total_count: 1, data: [{ lid: 1, lname: 'A', lcolor: '#fff' }] };
    const r = await runResource(lineDef, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: sample });
    expect(r.envelope!.pagination.next).toBeNull();
  });
  it('reports request-stage failure on a missing token', async () => {
    const def = { ...lineDef, request: { ...lineDef.request, url: 'https://api.x.com/{lineId}' } };
    const r = await runResource(def, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: {} });
    expect(r.ok).toBe(false);
    expect(r.stage).toBe('request');
  });
  it('reports parse-stage failure on an API error envelope', async () => {
    const def = { ...lineDef, response: { ...lineDef.response, errorPath: 'error' } };
    const r = await runResource(def, 'LINE', { params: {}, page: { offset: 0 }, sampleResponse: { error: 'bad key' } });
    expect(r.ok).toBe(false);
    expect(r.stage).toBe('parse');
    expect(r.message).toContain('bad key');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- runResource`
Expected: FAIL — cannot find module `index`/`runResource`.

- [ ] **Step 3: Implement the orchestrator**

`backend/src/connector/engine/index.ts`:
```ts
import { ConnectorDefinition, ResourceKind, PaginationSpec } from '../definition.types';
import { buildRequest, PageCursor } from './request';
import { executeRequest } from './fetch';
import { parseResponse, extractApiError } from './parse';
import { transformItem } from './transform';
import { validateItem } from './validate';

export interface NormalizedEnvelope {
  total_count: number;
  data: any[];
  pagination: { next: string | number | null };
}
export interface RunResult {
  ok: boolean;
  stage?: string;
  message?: string;
  raw?: any;
  envelope?: NormalizedEnvelope;
  diagnostics?: any[];
}
export interface RunParams {
  params: Record<string, any>;
  page?: PageCursor;
  secrets?: Record<string, string>;
  sampleResponse?: any;
}

function computeNext(p: PaginationSpec, page: PageCursor, count: number, total: number | null, nextCursorRaw: unknown): string | number | null {
  if (p.style === 'none') return null;
  if (p.style === 'cursor') return (nextCursorRaw as string) ?? null;
  if (count < p.limit) return null;
  if (p.style === 'offset') {
    const nextOffset = (page.offset ?? 0) + count;
    if (total !== null && nextOffset >= total) return null;
    return nextOffset;
  }
  // page style: a full page arrived (count === limit, checked above), so advance.
  // A subsequent short/empty page returns null via the count < limit check.
  return (page.page ?? p.startPage ?? 1) + 1;
}

export async function runResource(def: ConnectorDefinition, kind: ResourceKind, run: RunParams): Promise<RunResult> {
  const page = run.page ?? {};
  const secrets = run.secrets ?? {};

  const req = buildRequest(def, run.params, secrets, page);
  if (req.missing.length > 0) {
    return { ok: false, stage: 'request', message: `Missing required params: ${req.missing.join(', ')}` };
  }

  let raw: any;
  if (run.sampleResponse !== undefined) {
    raw = run.sampleResponse;
  } else {
    try {
      const res = await executeRequest(req);
      raw = res.data;
    } catch (e: any) {
      return { ok: false, stage: 'fetch', message: String(e?.message ?? e) };
    }
  }

  const apiError = extractApiError(raw, def.response);
  if (apiError) return { ok: false, stage: 'parse', message: `Upstream error: ${apiError}`, raw };

  const parsed = parseResponse(raw, def.response, def.request.pagination);

  const data: any[] = [];
  const diagnostics: any[] = [];
  for (const rawItem of parsed.items) {
    const t = await transformItem(rawItem, def.mapping);
    const v = validateItem(t.item, kind);
    data.push(t.item);
    diagnostics.push({ transform: t.diags, validate: v });
  }

  const ok = diagnostics.every(d =>
    d.transform.every((x: any) => x.status !== 'error') &&
    d.validate.every((x: any) => x.status === 'ok'));

  const next = computeNext(def.request.pagination, page, parsed.items.length, parsed.total, parsed.nextCursorRaw);

  return {
    ok,
    raw,
    envelope: { total_count: parsed.total ?? data.length, data, pagination: { next } },
    diagnostics,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- runResource`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all engine tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/connector/engine/index.ts backend/tests/runResource.test.ts
git commit -m "feat: add runResource pipeline orchestrator"
```

---

## Task 12: Prisma schema — ConnectorResource

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/lib/prisma.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `prisma` (shared `PrismaClient`); Prisma model `ConnectorResource` and enum `ResourceKind`

- [ ] **Step 1: Add the enum and model, keep old models for now**

In `backend/prisma/schema.prisma`, add:
```prisma
enum ResourceKind {
  LINE
  STOP
  DIRECTION
  NEXTPASSAGE
}

model ConnectorResource {
  id          String       @id @default(uuid())
  connectorId String
  connector   Connector    @relation(fields: [connectorId], references: [id], onDelete: Cascade)
  kind        ResourceKind
  name        String
  definition  Json
  secrets     Bytes?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([connectorId, kind])
}
```
And add the back-relation to `Connector` (keep existing `line/stop/direction/nextPassage` relations for now so the migration can read them):
```prisma
model Connector {
  // ...existing fields...
  resources   ConnectorResource[]
}
```

- [ ] **Step 2: Create and apply the migration**

Run (in `backend/`):
```bash
npm run prisma:migrate add_connector_resource
```
Expected: a new folder under `prisma/migrations/` and "Your database is now in sync". If the DB is not running, start it first with `docker compose up -d postgres`.

- [ ] **Step 3: Generate the client**

Run: `npm run prisma:generate`
Expected: "Generated Prisma Client".

- [ ] **Step 4: Create the shared client**

`backend/src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 5: Verify the client typechecks**

Run: `npx tsc --noEmit`
Expected: no errors (the new model/enum resolve).

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/lib/prisma.ts
git commit -m "feat: add ConnectorResource model + shared prisma client"
```

---

## Task 13: Data migration script

**Files:**
- Create: `backend/scripts/migrate-connectors.ts`
- Test: `backend/tests/migrate-connectors.test.ts`

**Interfaces:**
- Consumes: `ConnectorDefinition`/`ResourceKind` (Task 2), `prisma` (Task 12)
- Produces: `convertResourceRow(row: { apiUrl: string; params: string[]; transformation: any[] }, kind: ResourceKind): ConnectorDefinition`

**Migration rule (back-compat, reproduces current output):** keep the `{offset}` token inside the URL for LINE/STOP and set `pagination.style: 'none'` — the deployed client keeps sending `?offset=` and it fills the token exactly as today. Real pagination styles are adopted later when a connector is re-saved through the Phase 2 UI.

- [ ] **Step 1: Write the failing test for the conversion**

`backend/tests/migrate-connectors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { convertResourceRow } from '../scripts/migrate-connectors';

describe('convertResourceRow', () => {
  it('maps apiUrl, params, and transformation into a definition', () => {
    const def = convertResourceRow({
      apiUrl: 'https://api.x.com/lines?net={network}&offset={offset}',
      params: ['network'],
      transformation: [
        { original: 'data.line_id', transformed: 'data.id' },
        { original: 'data.line_name', transformed: 'data.name' },
      ],
    }, 'LINE');

    expect(def.request.url).toContain('{offset}');
    expect(def.request.pagination.style).toBe('none');
    expect(def.request.query).toEqual({ network: '{network}' });
    expect(def.response).toEqual({ format: 'json', rootPath: 'data' });
    expect(def.mapping.fields).toEqual([
      { target: 'data.id', source: 'data.line_id' },
      { target: 'data.name', source: 'data.line_name' },
    ]);
  });
  it('uses style none for direction too', () => {
    const def = convertResourceRow({ apiUrl: 'https://api.x.com/d', params: [], transformation: [] }, 'DIRECTION');
    expect(def.request.pagination.style).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- migrate-connectors`
Expected: FAIL — cannot find module `migrate-connectors`.

- [ ] **Step 3: Implement the conversion + script**

`backend/scripts/migrate-connectors.ts`:
```ts
import { prisma } from '../src/lib/prisma';
import { ConnectorDefinition, ResourceKind } from '../src/connector/definition.types';

export function convertResourceRow(
  row: { apiUrl: string; params: string[]; transformation: any[] },
  _kind: ResourceKind,
): ConnectorDefinition {
  const query: Record<string, string> = {};
  for (const p of row.params) query[p] = `{${p}}`;

  const fields = (row.transformation ?? []).map((t: any) => ({
    target: t.transformed,
    source: t.original,
  }));

  return {
    request: {
      method: 'GET',
      url: row.apiUrl,
      query,
      pagination: { style: 'none' },
    },
    response: { format: 'json', rootPath: 'data' },
    mapping: { fields },
  };
}

const TABLES: { kind: ResourceKind; read: () => Promise<any[]> }[] = [
  { kind: 'LINE', read: () => prisma.line.findMany() },
  { kind: 'STOP', read: () => prisma.stop.findMany() },
  { kind: 'DIRECTION', read: () => prisma.direction.findMany() },
  { kind: 'NEXTPASSAGE', read: () => prisma.nextPassage.findMany() },
];

export async function migrate(): Promise<void> {
  for (const { kind, read } of TABLES) {
    const rows = await read();
    for (const row of rows) {
      try {
        const definition = convertResourceRow(row, kind);
        await prisma.connectorResource.upsert({
          where: { connectorId_kind: { connectorId: row.connectorId, kind } },
          update: { name: row.name, definition: definition as any },
          create: { connectorId: row.connectorId, kind, name: row.name, definition: definition as any },
        });
        console.log(`migrated ${kind} for connector ${row.connectorId}`);
      } catch (e) {
        console.error(`SKIP ${kind} connector ${row.connectorId}:`, e);
      }
    }
  }
}

if (require.main === module) {
  migrate().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- migrate-connectors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/migrate-connectors.ts backend/tests/migrate-connectors.test.ts
git commit -m "feat: add connector data migration script"
```

---

## Task 14: Generic resource routes (CRUD + preview + proxy)

**Files:**
- Create: `backend/src/connector/definition.schema.ts`
- Create: `backend/src/routes/connector/resource.routes.ts`
- Test: `backend/tests/resource.routes.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 12), `runResource`/`RunParams` (Task 11), `KIND_BY_PARAM`/`ConnectorDefinition` (Task 2), `getKey`/`encryptSecrets`/`maskSecrets` (Task 5), `extractTokens` (Task 4)
- Produces:
  - `validateDefinition(def: any): string[]`
  - `requiredParams(def: ConnectorDefinition): string[]`
  - `createConnectorResourceRouter(): Router`

- [ ] **Step 1: Write the failing tests (prisma + engine mocked)**

`backend/tests/resource.routes.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    connectorResource: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => { req.user = { id: 1 }; next(); },
}));

import { prisma } from '../src/lib/prisma';
import { validateDefinition, requiredParams, createConnectorResourceRouter } from '../src/routes/connector/resource.routes';

process.env.CONNECTOR_SECRET_KEY = Buffer.alloc(32, 3).toString('base64');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/connector/:connectorId', createConnectorResourceRouter());
  return a;
}

const goodDef = {
  request: { method: 'GET', url: 'https://api.x.com/l', pagination: { style: 'none' } },
  response: { format: 'json', rootPath: 'data' },
  mapping: { fields: [{ target: 'id', source: 'lid' }] },
};

describe('validateDefinition', () => {
  it('accepts a well-formed definition', () => {
    expect(validateDefinition(goodDef)).toEqual([]);
  });
  it('rejects a missing request.url', () => {
    const bad = { ...goodDef, request: { ...goodDef.request, url: undefined } };
    expect(validateDefinition(bad).length).toBeGreaterThan(0);
  });
});

describe('requiredParams', () => {
  it('lists non-secret tokens from url + query', () => {
    const def: any = { request: { url: 'https://x/{lineId}', query: { d: '{dir}' }, pagination: { style: 'none' } }, response: { format: 'json', rootPath: '' }, mapping: { fields: [] } };
    expect(requiredParams(def).sort()).toEqual(['dir', 'lineId']);
  });
});

describe('resource routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET returns the resource with masked secrets and params', async () => {
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ id: 'r1', connectorId: 'c1', kind: 'LINE', name: 'L', definition: goodDef, secrets: null });
    const res = await request(app()).get('/api/connector/c1/line');
    expect(res.status).toBe(200);
    expect(res.body.params).toEqual([]);
    expect(res.body.secrets).toEqual({});
  });

  it('PATCH rejects a malformed definition', async () => {
    const res = await request(app()).patch('/api/connector/c1/line').send({ name: 'L', definition: { request: {} } });
    expect(res.status).toBe(422);
  });

  it('preview returns diagnostics for a broken mapping', async () => {
    (prisma.connectorResource.findUnique as any).mockResolvedValue({ connectorId: 'c1', kind: 'LINE', name: 'L', definition: goodDef, secrets: null });
    const res = await request(app())
      .post('/api/connector/c1/line/preview')
      .send({ sampleResponse: { data: [{ nope: 1 }] } });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.envelope.data.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- resource.routes`
Expected: FAIL — cannot find module `resource.routes`.

- [ ] **Step 3: Implement the definition validator + helpers**

`backend/src/connector/definition.schema.ts`:
```ts
import { ConnectorDefinition } from './definition.types';
import { extractTokens } from './engine/template';

const PAGINATION_STYLES = ['none', 'offset', 'page', 'cursor'];

export function validateDefinition(def: any): string[] {
  const errors: string[] = [];
  if (typeof def !== 'object' || def === null) return ['definition must be an object'];

  const r = def.request;
  if (typeof r !== 'object' || r === null) errors.push('request is required');
  else {
    if (r.method !== 'GET' && r.method !== 'POST') errors.push('request.method must be GET or POST');
    if (typeof r.url !== 'string' || r.url.length === 0) errors.push('request.url is required');
    if (typeof r.pagination !== 'object' || !PAGINATION_STYLES.includes(r.pagination?.style)) errors.push('request.pagination.style is invalid');
  }

  const resp = def.response;
  if (typeof resp !== 'object' || resp === null) errors.push('response is required');
  else {
    if (resp.format !== 'json') errors.push("response.format must be 'json'");
    if (typeof resp.rootPath !== 'string') errors.push('response.rootPath must be a string');
  }

  const map = def.mapping;
  if (typeof map !== 'object' || map === null || !Array.isArray(map.fields)) errors.push('mapping.fields must be an array');
  else {
    map.fields.forEach((f: any, i: number) => {
      if (typeof f.target !== 'string' || !f.target) errors.push(`mapping.fields[${i}].target is required`);
      if (f.source === undefined && f.expr === undefined && !Array.isArray(f.ops)) errors.push(`mapping.fields[${i}] needs source, expr, or ops`);
      if (f.source !== undefined && f.expr !== undefined) errors.push(`mapping.fields[${i}] cannot have both source and expr`);
    });
  }

  return errors;
}

export function requiredParams(def: ConnectorDefinition): string[] {
  const tokens = new Set<string>();
  extractTokens(def.request.url).forEach(t => tokens.add(t));
  for (const v of Object.values(def.request.query ?? {})) extractTokens(v).forEach(t => tokens.add(t));
  for (const v of Object.values(def.request.headers ?? {})) extractTokens(v).forEach(t => tokens.add(t));
  return [...tokens];
}
```

- [ ] **Step 4: Implement the router**

`backend/src/routes/connector/resource.routes.ts`:
```ts
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticateToken } from '../../middleware/auth';
import { KIND_BY_PARAM, ConnectorDefinition } from '../../connector/definition.types';
import { runResource } from '../../connector/engine';
import { encryptSecrets, decryptSecrets, maskSecrets, getKey } from '../../connector/engine/secrets';
export { validateDefinition, requiredParams } from '../../connector/definition.schema';
import { validateDefinition, requiredParams } from '../../connector/definition.schema';

function decrypt(blob: Buffer): Record<string, string> {
  return decryptSecrets(blob, getKey());
}

function resolveKind(req: Request, res: Response): 'LINE' | 'STOP' | 'DIRECTION' | 'NEXTPASSAGE' | null {
  const kind = KIND_BY_PARAM[req.params.kind];
  if (!kind) { res.status(404).json({ error: `Unknown resource: ${req.params.kind}` }); return null; }
  return kind;
}

async function loadResource(connectorId: string, kind: any) {
  return prisma.connectorResource.findUnique({ where: { connectorId_kind: { connectorId, kind } } });
}

export function createConnectorResourceRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET config (back-compat: exposes params + masked secrets)
  router.get('/:kind', authenticateToken, async (req, res) => {
    const kind = resolveKind(req, res); if (!kind) return;
    const row = await loadResource(req.params.connectorId, kind);
    if (!row) return res.status(404).json({ error: 'Resource not found' });
    res.json({
      id: row.id, connectorId: row.connectorId, kind: row.kind, name: row.name,
      definition: row.definition,
      params: requiredParams(row.definition as unknown as ConnectorDefinition),
      secrets: maskSecrets(row.secrets as Buffer | null, getKey()),
    });
  });

  // Upsert config
  router.patch('/:kind', authenticateToken, async (req, res) => {
    const kind = resolveKind(req, res); if (!kind) return;
    const { name, definition, secrets } = req.body;
    const errors = validateDefinition(definition);
    if (errors.length) return res.status(422).json({ errors });

    const encrypted = secrets && Object.keys(secrets).length ? encryptSecrets(secrets, getKey()) : undefined;
    const row = await prisma.connectorResource.upsert({
      where: { connectorId_kind: { connectorId: req.params.connectorId, kind } },
      update: { name, definition, ...(encrypted ? { secrets: encrypted } : {}) },
      create: { connectorId: req.params.connectorId, kind, name: name ?? '', definition, secrets: encrypted },
    });
    res.json({ id: row.id, kind: row.kind, name: row.name });
  });

  router.delete('/:kind', authenticateToken, async (req, res) => {
    const kind = resolveKind(req, res); if (!kind) return;
    await prisma.connectorResource.delete({ where: { connectorId_kind: { connectorId: req.params.connectorId, kind } } });
    res.json({ ok: true });
  });

  // Preview / dry-run (authenticated)
  router.post('/:kind/preview', authenticateToken, async (req, res) => {
    const kind = resolveKind(req, res); if (!kind) return;
    const row = await loadResource(req.params.connectorId, kind);
    if (!row) return res.status(404).json({ error: 'Resource not found' });
    const secrets = row.secrets ? decrypt(row.secrets as Buffer) : {};
    const result = await runResource(row.definition as unknown as ConnectorDefinition, kind, {
      params: req.body.params ?? {},
      page: req.body.page,
      secrets,
      sampleResponse: req.body.sampleResponse,
    });
    res.json({ ok: result.ok, stage: result.stage, message: result.message, raw: result.raw, envelope: result.envelope, diagnostics: result.diagnostics });
  });

  // Proxy (unauthenticated for mobile back-compat; SSRF-guarded in fetch)
  router.get('/:kind/proxy', async (req, res) => {
    const kind = resolveKind(req, res); if (!kind) return;
    const row = await loadResource(req.params.connectorId, kind);
    if (!row) return res.status(404).json({ error: 'Resource not found' });
    const secrets = row.secrets ? decrypt(row.secrets as Buffer) : {};
    const page = {
      offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
      page: req.query.page !== undefined ? Number(req.query.page) : undefined,
      cursor: req.query.cursor as string | undefined,
    };
    const result = await runResource(row.definition as unknown as ConnectorDefinition, kind, {
      params: req.query as Record<string, any>, page, secrets,
    });
    if (!result.ok && result.stage && result.stage !== 'validate') {
      return res.status(result.stage === 'fetch' ? 502 : 400).json({ error: result.message, stage: result.stage });
    }
    res.json(result.envelope);
  });

  return router;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- resource.routes`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/connector/definition.schema.ts backend/src/routes/connector/resource.routes.ts backend/tests/resource.routes.test.ts
git commit -m "feat: add generic connector resource routes (CRUD + preview + proxy)"
```

---

## Task 15: Wire router, migrate data, remove old code

**Files:**
- Modify: `backend/src/routes/connector/mainRouter.ts`
- Modify: `backend/prisma/schema.prisma`
- Delete: `backend/src/routes/connector/line.routes.ts`, `stop.routes.ts`, `direction.routes.ts`, `nextpassage.routes.ts`, and `backend/src/routes/connector/proxy/*.proxy.routes.ts`

**Interfaces:**
- Consumes: `createConnectorResourceRouter` (Task 14), `migrate` (Task 13)
- Produces: connector endpoints served by the generic router; old models/files removed

- [ ] **Step 1: Read the current mainRouter**

Run: open `backend/src/routes/connector/mainRouter.ts` and note how sub-routers are mounted (proxy routes at the top, per the spec's `mainRouter.ts:16-22`).

- [ ] **Step 2: Mount the generic router; keep `connector.routes` and `compliance.routes`**

Replace the per-resource and proxy mounts in `backend/src/routes/connector/mainRouter.ts` with:
```ts
import { Router } from 'express';
import connectorRoutes from './connector.routes';
import complianceRoutes from './compliance.routes';
import { createConnectorResourceRouter } from './resource.routes';

const router = Router();

router.use('/compliance', complianceRoutes);
router.use('/:connectorId', createConnectorResourceRouter());
router.use('/', connectorRoutes);

export default router;
```
(Keep the exact existing import style/paths for `connector.routes` and `compliance.routes`; only the resource + proxy sub-routers are replaced.)

- [ ] **Step 3: Typecheck and run the suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Run the data migration against the dev DB**

Run (with the DB up):
```bash
npx ts-node scripts/migrate-connectors.ts
```
Expected: `migrated LINE for connector ...` lines; no unhandled errors. (If `ts-node` is not present, use `npx ts-node-dev --respawn=false scripts/migrate-connectors.ts` or compile first.)

- [ ] **Step 5: Manually verify parity**

Run the dev server (`npm run dev`) and compare one migrated connector against the previous behavior:
```bash
curl "http://localhost:3000/api/connector/<id>/line/proxy?offset=0&<params>"
```
Expected: the same normalized items the old proxy returned, now wrapped as `{ total_count, data, pagination }`. Confirm `data` matches the old output field-for-field.

- [ ] **Step 6: Remove old models and generate a drop migration**

In `backend/prisma/schema.prisma`, delete the `Line`, `Stop`, `Direction`, `NextPassage` models and the `line/stop/direction/nextPassage` relations on `Connector`. Then:
```bash
npm run prisma:migrate drop_legacy_resource_tables
npm run prisma:generate
```
Expected: migration drops the four tables; client regenerates.

- [ ] **Step 7: Delete the old route files**

```bash
git rm backend/src/routes/connector/line.routes.ts backend/src/routes/connector/stop.routes.ts backend/src/routes/connector/direction.routes.ts backend/src/routes/connector/nextpassage.routes.ts
git rm backend/src/routes/connector/proxy/line.proxy.routes.ts backend/src/routes/connector/proxy/stop.proxy.routes.ts backend/src/routes/connector/proxy/direction.proxy.routes.ts backend/src/routes/connector/proxy/nxpassage.proxy.routes.ts
```

- [ ] **Step 8: Final typecheck + test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: wire generic connector router, migrate data, remove legacy resource code"
```

---

## Environment note

Add to `backend/.env` (and document in the deployment env): `CONNECTOR_SECRET_KEY=<base64 of 32 random bytes>`, e.g. generated via `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. The server throws on secret use if this is unset.

## Out of scope (later phases)

- **Phase 2 (web):** rebuild `frontend/components/Transformer.tsx` into Request/Mapping/Preview panels calling the new preview endpoint; fix the double-fetch; bundle compliance as a constant.
- **Phase 3 (mobile):** send canonical params (drop `_fetchResourceParams`), consume `pagination.next`, add auto-refresh to next-passage; add auth to proxy calls.
