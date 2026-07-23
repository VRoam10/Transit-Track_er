# Connector Flexibility Redesign — Phase 1: Backend Foundation

- **Date:** 2026-07-23
- **Status:** Approved design, ready for implementation planning
- **Scope:** Backend only. Web (Phase 2) and mobile (Phase 3) get their own specs.

## Problem

The connector system cannot adapt to the variety of real-world transit APIs. Every layer
inherits the same rigidity, rooted in the backend's definition model:

- **Request/auth:** only `GET` + URL `{placeholder}` substitution. No custom headers,
  API keys, bearer/OAuth tokens, POST bodies. Pagination is hardcoded — `offset` is forced
  for line/stop and forbidden for direction/nextpassage
  (`src/routes/connector/proxy/line.proxy.routes.ts:22-25`). Cursor / page-number /
  no-pagination APIs do not fit.
- **Response shape:** a fixed `{ total_count, data: [...] }` envelope is assumed. A bare
  array, a differently-nested payload, or non-JSON breaks it.
- **Value transformation:** `applyTransformation` (`src/utils/transform.ts:6-43`) is a
  whitelist-and-rename only. It cannot convert a value — no date/time reformatting, type
  coercion, unit conversion, defaults, computed/concatenated fields, constants, or
  fallbacks. Anything unmapped is silently dropped.
- **Robustness/feedback:** no validation, no diagnostics, no way to test a connector before
  it goes live. Mismatches fail silently (empty objects filtered out) or 500.

Secondary issues addressed opportunistically because we are rewriting these files: 13
per-module `new PrismaClient()` instances, and four near-identical proxy/CRUD file sets.

## Goals (Phase 1)

1. A single, richer **Connector Definition** JSON schema that fully describes how to call an
   external API and normalize its response — the shared contract for all three layers.
2. A single generic **execution engine** that runs any definition:
   `resolveSecrets → buildRequest → fetch → parseResponse → transform → validate → respond`.
3. A **hybrid transformation layer**: GUI-buildable typed ops for common cases, plus a
   sandboxed JSONata `expr` escape hatch for the hard ones.
4. A **preview/dry-run endpoint** returning `raw → transformed → diagnostics` so connectors
   are proven before going live; the proxy reuses the same validation.
5. **Consolidate** the four resource tables into one generic `ConnectorResource`, so there is
   one tested code path instead of four.
6. **Encrypted secrets** so API keys are never stored or returned in plaintext.
7. A **data migration** that converts every existing connector to the new model with no loss.
8. **Backward compatibility:** the currently-deployed mobile app keeps working unchanged
   until Phase 3.

## Non-goals (Phase 1)

- Web Transformer UI rebuild (Phase 2).
- Mobile canonical-params / pagination / auto-refresh changes (Phase 3).
- Non-JSON response formats (XML, GTFS-RT, SIRI). The `response.format` field is designed to
  admit them later, but only `json` is implemented now.
- Caching / rate-limiting. Deliberately deferred — flexibility is the priority, not throughput.

## The Connector Definition schema

Stored as one `definition: Json` per resource. TypeScript types (new file
`src/connector/definition.types.ts`) are the source of truth; validated at write time.

```ts
type ResourceKind = 'LINE' | 'STOP' | 'DIRECTION' | 'NEXTPASSAGE';

interface ConnectorDefinition {
  request: RequestSpec;
  response: ResponseSpec;
  mapping: MappingSpec;
}

interface RequestSpec {
  method: 'GET' | 'POST';
  url: string;                       // supports {token} and {{secret.name}}
  headers?: Record<string, string>;  // templated values
  query?: Record<string, string>;    // static + templated, e.g. { line: "{lineId}" }
  body?: unknown;                     // templated (POST only)
  pagination: PaginationSpec;
  timeoutMs?: number;                 // default 8000
}

type PaginationSpec =
  | { style: 'none' }
  | { style: 'offset'; limit: number; limitParam?: string; offsetParam: string; totalPath?: string }
  | { style: 'page';   limit: number; limitParam?: string; pageParam: string; startPage?: number; totalPath?: string }
  | { style: 'cursor'; limit: number; limitParam?: string; cursorParam: string; cursorPath: string };

interface ResponseSpec {
  format: 'json';                    // xml/gtfs-rt reserved for later
  rootPath: string;                  // dotted path to the item array; "" = response root
  errorPath?: string;                // dotted path to an API error message, if present
}

interface MappingSpec {
  fields: FieldMapping[];
}

// A field produces its value from `expr`, OR from `source` + `ops`, OR from `ops` alone
// when the pipeline starts with a value-producing op (`const`/`coalesce`). `expr` and
// `source` are mutually exclusive.
interface FieldMapping {
  target: string;                    // normalized field, dotted path allowed for nested
                                     // output (e.g. "coordonnees.lat")
  source?: string;                   // dotted path into a single item
  ops?: Op[];                        // pipeline applied to the extracted value
  expr?: string;                     // JSONata evaluated against the item (escape hatch)
}

type Op =
  | { op: 'default'; value: unknown }
  | { op: 'const'; value: unknown }
  | { op: 'toInt' } | { op: 'toFloat' } | { op: 'toString' } | { op: 'toBool' }
  | { op: 'parseDate'; from: 'unix' | 'unixMs' | 'iso' | string /* moment format */ }
  | { op: 'formatDate'; to: 'iso' | string /* moment format */ }
  | { op: 'coalesce'; paths: string[] }        // first non-null of these item paths
  | { op: 'concat'; sep?: string; parts: string[] } // literals or {token} item paths
  | { op: 'prefix'; value: string } | { op: 'suffix'; value: string }
  | { op: 'lookup'; map: Record<string, unknown>; fallback?: unknown }
  | { op: 'round'; decimals?: number }
  | { op: 'multiply'; by: number };            // e.g. unit conversion
```

**Templating.** `{token}` resolves from runtime params (canonical client params + pagination
params). `{{secret.name}}` resolves from decrypted secrets. Missing `{token}` in a required
position is a validation error, not a silent empty substitution (fixes the current
`buildUrl` behavior at `src/utils/transform.ts:49-58`).

**Output envelope.** Every resource returns the same shape, regardless of the external API:

```jsonc
{ "total_count": 128, "data": [ /* normalized items */ ], "pagination": { "next": "<cursor|offset|page|null>" } }
```

`data` is retained as the item key so the current mobile app (which reads `body['data']`)
keeps working.

## Data model changes (Prisma)

Consolidate the four resource tables into one, keyed by `kind`:

```prisma
enum ResourceKind { LINE STOP DIRECTION NEXTPASSAGE }

model ConnectorResource {
  id          String       @id @default(uuid())
  connectorId String
  connector   Connector    @relation(fields: [connectorId], references: [id], onDelete: Cascade)
  kind        ResourceKind
  name        String
  definition  Json         // ConnectorDefinition
  secrets     Bytes?       // AES-256-GCM ciphertext of { name: value } map; null if none
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([connectorId, kind])   // preserves the old 1:1-per-kind guarantee
}

model Connector {
  id         String              @id @default(uuid())
  name       String              @unique
  userId     Int
  user       User                @relation(fields: [userId], references: [id])
  resources  ConnectorResource[]
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
}
```

Notes:
- `Connector.apiUrl` (currently `schema.prisma:34`) is dropped — the per-resource
  `definition.request.url` is authoritative. The migration folds it in where a resource URL
  is empty (unlikely, but safe).
- The old `Line`/`Stop`/`Direction`/`NextPassage` models are removed after the data
  migration copies their rows into `ConnectorResource`.
- `onDelete: Cascade` replaces the manual delete plumbing.

## Execution engine

New module `src/connector/engine/`, one stage per file, each independently unit-testable:

| File | Responsibility |
|------|----------------|
| `secrets.ts` | AES-256-GCM encrypt/decrypt of the secrets map, key from `CONNECTOR_SECRET_KEY` env. Masks secrets in API responses. |
| `template.ts` | Resolve `{token}` and `{{secret.name}}` in strings/objects; report missing required tokens. |
| `request.ts` | `buildRequest(def, params, secrets)` → `{ method, url, headers, query, body, timeoutMs }`, including pagination params for the requested page. |
| `fetch.ts` | Execute the request via a **shared axios instance** with timeout + keep-alive; one retry on network error/5xx. Isolated so tests can inject a mock. |
| `parse.ts` | `format`-aware parse; extract item array via `rootPath`; extract `total`/`next` cursor; detect API error via `errorPath`. |
| `ops.ts` | The typed-op library above. Pure functions, exhaustively unit-tested. `parseDate`/`formatDate` use the already-present `moment` dependency. |
| `transform.ts` | Per-item: for each field, extract `source` + run `ops`, or evaluate `expr` (JSONata). Returns normalized item + per-field diagnostics. |
| `validate.ts` | Check normalized items against the compliance schema for `kind`; collect diagnostics. |
| `index.ts` | `runResource(def, kind, params, secrets, { dryRun })` orchestrating the pipeline. |

- **Shared PrismaClient:** introduce `src/lib/prisma.ts` exporting one client; the new
  connector modules import it. (Migrating the other 13 call sites is out of scope but the
  singleton is available.)
- **JSONata** is the one new dependency (pure-JS, sandboxed — no arbitrary JS execution).
  Expressions are evaluated per item against the item object.
- **SSRF guard** in `fetch.ts`: reject outbound requests to private/loopback/link-local IP
  ranges and non-http(s) schemes. (The proxy stays unauthenticated in Phase 1 for mobile
  back-compat; auth is revisited in Phase 3. This guard is the interim protection.)

## Diagnostics format

Returned by preview and included in proxy error responses:

```jsonc
{
  "ok": false,
  "stage": "transform",                 // request | fetch | parse | transform | validate
  "message": "human-readable summary",
  "fields": [
    { "target": "nextTrain", "status": "missing",  "detail": "source 'departure' not found in item" },
    { "target": "id",        "status": "ok" },
    { "target": "order",     "status": "wrongType", "expected": "Int", "got": "String" }
  ]
}
```

## API endpoints

Mounted under `/api/connector` (replacing the four proxy files + four CRUD files):

- **Resource CRUD** — `GET|POST|PUT|PATCH|DELETE /api/connector/:connectorId/:kind`
  (`kind` ∈ `line|stop|direction|nxpassage`). Authenticated. Validates the `definition`
  against the schema on write (rejects malformed definitions with field-level errors).
  Secrets are write-only: accepted on write, never returned (masked as `"***"`).
- **Preview** — `POST /api/connector/:connectorId/:kind/preview`. Authenticated. Body may
  include `params` and an optional pasted `sampleResponse` (skips the live fetch). Returns
  `{ raw, transformed, diagnostics }`.
- **Proxy** — `GET /api/connector/:connectorId/:kind/proxy`. Reads canonical params from the
  query string, runs the pipeline live, returns the normalized envelope or a structured error
  (no more silent drops / bare 500s).

One route module parameterized by `kind` replaces the eight duplicated files.

## Canonical params & backward compatibility

End state (completed in Phase 3): clients send canonical params — `lineId`, `directionId`,
`stopId`, and `offset`/`cursor` — and the `request.query`/`url` templates map them to the
external API's real names. The client never learns external param names, which removes the
mobile `_fetchResourceParams` round-trip.

Phase 1 keeps the deployed mobile working by **not requiring** canonical names: the proxy
passes every query param through to the templating context, and the migration produces
definitions whose templates reference the *existing* param names. So today's mobile requests
(`?<externalParam>=X&offset=Y`) resolve unchanged, while newly-authored connectors can adopt
canonical names immediately. Direction/nextpassage migrate to `pagination.style: 'none'`, so
their current offset-less requests keep working; line/stop migrate to `style: 'offset'`.

## Data migration

A Prisma migration plus a one-shot data script (`prisma/migrations/*` + `scripts/migrate-connectors.ts`):

For each old `Line|Stop|Direction|NextPassage` row → one `ConnectorResource`:
- `kind` from the source table.
- `definition.request.url` = old `apiUrl`; `method` = `GET`.
- `definition.request.query` = one `{param}: "{param}"` entry per old `params` string.
- `definition.request.pagination` = `offset` (limit 50) for LINE/STOP, else `none`.
- `definition.response` = `{ format: 'json', rootPath: 'data' }` (matches the current
  implicit envelope and compliance schema).
- `definition.mapping.fields` = old `transformation` pairs mapped to
  `{ target: <`transformed` path>, source: <`original` path> }`. Because `target` now
  supports dotted paths, the normalized output nesting is preserved; a migration test
  asserts old vs. new produce identical output on a sample response.
- `secrets` = null.

The script is idempotent and logs any row it cannot convert rather than aborting the batch.
Run order: create `ConnectorResource` table → run data script → drop old tables.

## Testing strategy (TDD)

The backend currently has **no test runner**. Introduce **vitest** (TS-native, fast, minimal
config) as a dev dependency with a `test` script. Follow test-driven development: write the
failing test for each engine stage before implementing it.

- **Unit (pure, no I/O):** every `Op` (edge cases: nulls, wrong types, missing paths,
  date formats); `template` (missing tokens, secret refs); `parse` (bare array, nested
  root, cursor/total extraction, error path); `transform` (source+ops, expr, per-field
  diagnostics); `validate` (missing/wrong-type detection); `secrets` (round-trip
  encrypt/decrypt, masking).
- **Integration (mocked axios):** `runResource` end-to-end for each pagination style, an
  auth-header API, a bare-array API, an error-envelope API, and a JSONata `expr` case.
- **Route:** preview returns diagnostics for a deliberately broken mapping; proxy returns the
  normalized envelope; CRUD rejects a malformed definition and masks secrets.
- **Migration:** a fixture of representative old rows converts to definitions that reproduce
  the current output on a sample response.

## Rollout

1. Add `ConnectorResource` + engine + endpoints behind the new routes, old routes still live.
2. Run the data migration; verify old + new produce identical output on real connectors.
3. Switch the router to the new endpoints; drop old proxy/CRUD files and old tables.
4. Mobile and web continue hitting the same URLs with the same request/response shapes.

## Resolved decisions

- Transformation model: **hybrid** (typed ops + JSONata escape hatch).
- Data model: **consolidated** single `ConnectorResource` table.
- Scope: **Phase 1 backend only**; web and mobile follow in their own specs.
- New dependencies: **jsonata** (runtime), **vitest** (dev).
- Secrets: **AES-256-GCM**, key from `CONNECTOR_SECRET_KEY`.
