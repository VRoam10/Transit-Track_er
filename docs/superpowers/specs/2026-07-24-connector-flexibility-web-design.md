# Connector Flexibility Redesign — Phase 2: Web Back-Office

- **Date:** 2026-07-24
- **Status:** Approved design, ready for implementation planning
- **Depends on:** Phase 1 (backend) — merged to `dev` (`ConnectorResource`, engine, generic routes).
- **Scope:** Two small backend tweaks to the connector resource routes + a full rebuild of the
  web back-office connector authoring UI. Mobile is Phase 3.

## Problem

The Phase 1 backend replaced the connector model, but the web back-office
(`frontend/components/Transformer.tsx`, 707 lines) still targets the old contract and is
effectively broken against `dev`:

- It **fetches the external API directly from the browser** (`Transformer.tsx:128`) — CORS-prone,
  bypasses the backend proxy, and can't use server-stored secrets.
- It reimplements transform + compliance-validation + field-discovery client-side (~400 lines)
  that now duplicate the real engine.
- It **saves the old payload** `{ name, apiUrl, transformation, params }` (`Transformer.tsx:253-258`);
  the new PATCH expects `{ name, definition, secrets }` → every save 422s.
- It reads `recordData.apiUrl` / `recordData.transformation` (`Transformer.tsx:66-73`); the new GET
  returns `{ definition, params, secrets }` → "Load Saved" is broken.
- `useFetch` (`frontend/hooks/useFetch.ts`) fires with `token=null` then refires with the real
  token (guaranteed double-fetch, first one 401), never resets `loading`, and has no cleanup.
- `Connectors.tsx` does a full `window.location.reload()` after delete.

## Goals

1. Rebuild connector authoring so it drives the **real backend engine** via the `preview`
   endpoint (server-side fetch, real transform, real diagnostics) — deleting the client-side
   duplication.
2. Author the full new `ConnectorDefinition`: request (method/url/headers/query/pagination/
   timeout/secrets), response (format/rootPath/errorPath), mapping (per-target `source` + a full
   **ops pipeline builder**, or a JSONata `expr`).
3. Let the author **test unsaved edits** and **not lose secrets** when editing (two backend
   tweaks below).
4. Fix the adjacent breakages (double-fetch, delete-reload).
5. Keep both light/dark themes on every element (project convention).

## Non-goals (Phase 2)

- Mobile changes (Phase 3).
- Restructuring connector-create or removing `Connector.apiUrl` (that column is dropped by the
  Phase 1 DB runbook; touching it here couples Phase 2 to that deferred step).
- SWR/react-query (decided: fix `useFetch` instead).
- A shared front/back types package (compliance + definition types are duplicated on the
  frontend by decision; they change rarely).

## Backend tweaks (both in `backend/src/routes/connector/resource.routes.ts`)

### T1 — `preview` accepts an inline definition + secrets, and works before first save

`POST /api/connector/:connectorId/:kind/preview`. New optional body fields: `definition`,
`secrets` (a `{ name: value }` map). Flow:

1. `resolveKind`; `assertOwner(connector)` → 404 if not owned (unchanged auth/ownership).
2. Load the stored resource (may be `null` — a connector being authored for the first time).
3. `definition = body.definition ?? stored?.definition`. If none → 404 `{ error: 'No definition to preview' }`.
   If `body.definition` present → `validateDefinition(body.definition)`; 422 with the errors if invalid.
4. `secrets = { ...(stored?.secrets ? decrypt(stored.secrets) : {}), ...(body.secrets ?? {}) }`
   (inline values override stored, for this run only; never persisted).
5. `runResource(definition, kind, { params: body.params, page: body.page, secrets, sampleResponse: body.sampleResponse })`.
6. Return `{ ok, stage, message, raw, envelope, diagnostics }` (unchanged shape).

Tests: inline definition overrides stored; inline secret used in templating; malformed inline
definition → 422; preview with `stored = null` + inline definition succeeds (owner) / 404 (non-owner).

### T2 — PATCH merges secrets instead of replacing the blob

Existing secret values are masked in GET, so the author cannot re-send them; a wholesale replace
would drop them. New PATCH secret handling: if `body.secrets` is present, decrypt the existing
blob (if any), then for each entry — a string value sets/updates the key, a `null` value deletes
the key, unmentioned keys are preserved — then re-encrypt and store. If the merged map is empty,
store `null`. If `body.secrets` is omitted, leave the stored secrets untouched.

Tests: merge adds a new secret while preserving an existing one; `null` deletes a key; omitting
`secrets` keeps existing; merging down to empty stores `null`.

## Frontend architecture

### Data layer

- **Fix `frontend/hooks/useFetch.ts`:** add a `skip?: boolean` option; when `skip` is true the
  effect does not fetch (used as `skip: !token` so no request fires until the token resolves —
  kills the double-fetch). Set `loading` true at the start of every run. Use an `AbortController`,
  aborting on unmount / dependency change, and ignore aborted responses. Same `{ data, loading,
  error }` return.
- **New `frontend/lib/connectorApi.ts`:** typed imperative client functions, each taking a token,
  reading `NEXT_PUBLIC_API_URL`, attaching the Bearer header, and throwing on non-ok with the
  backend `error`/`errors` surfaced:
  - `getResource(connectorId, kind, token)` → `{ id, connectorId, kind, name, definition, params, secrets }`
  - `saveResource(connectorId, kind, { name, definition, secrets }, token)` (PATCH)
  - `previewResource(connectorId, kind, { definition, secrets, params, page, sampleResponse }, token)` (POST)
  - `deleteResource(connectorId, kind, token)`
  - `listConnectors(token)`, `getConnector(id, token)`
  `useFetch` stays for the declarative GETs (list / connector / record hydration); preview, save,
  and delete are imperative via this client (called on button clicks).

### Definition model + pure helpers (`frontend/lib/connectorDefinition.ts`, vitest-tested)

- TS types mirroring the backend `ConnectorDefinition`, `RequestSpec`, `PaginationSpec`,
  `ResponseSpec`, `MappingSpec`, `FieldMapping`, `Op` (duplicated by decision).
- `emptyDefinition(): ConnectorDefinition` — blank scaffold (GET method, empty url,
  `pagination.style: 'none'`, `response.format:'json'`, `rootPath:''`, no fields).
- `complianceTargets(kind)` returns a list of `TargetField`, where
  `TargetField = { name: string; type?: 'String'|'Int'|'Float'|'Datetime'|'Boolean'; optional?: boolean; children?: TargetField[] }`
  (a leaf has `type`; a nested object like NEXTPASSAGE `coordonnees` has `children` instead).
  Bundled as a constant mirroring `backend/src/connector/compliance.ts`. Nested target rows use a
  dotted target path (e.g. `coordonnees.lat`) so they map straight onto the engine's `setPath`.
- `extractSourcePaths(raw: unknown, rootPath: string): string[]` — resolve the array/object at
  `rootPath`, take the first item, and walk it into dotted candidate source paths (nested objects
  included). `[]` when there are no items. (Replaces the old `getNestedFields`, now producing
  source-path suggestions rather than a mapping list.)
- `diagnosticsByTarget(diagnostics): Record<string, { status: 'ok'|'missing'|'wrongType'|'error'; detail?: string }>`
  — flatten the FIRST item's `{ transform[], validate[] }` diagnostics into a per-target status
  (a target is a problem if its transform diag is `error` or its validate diag is `missing`/
  `wrongType`).

### UI components (`frontend/components/connector/`)

- **`RequestPanel.tsx`** — edits `definition.request` + a secrets draft: method select, url input,
  headers (key/value list), query (key/value list), pagination (style select revealing
  style-specific fields: offset/page/cursor params, limit, totalPath/cursorPath), timeout, and a
  secrets editor (existing keys shown with masked values; add key/value; mark a key for deletion).
- **`OpEditor.tsx`** — given an `Op` and an onChange, render the inputs for that op type
  (`default`/`const`→value, `toInt`/`toFloat`/`toString`/`toBool`→none, `parseDate`→`from`,
  `formatDate`→`to`, `coalesce`→paths list, `concat`→sep+parts, `prefix`/`suffix`→value,
  `lookup`→map key/value editor + fallback, `round`→decimals, `multiply`→by).
- **`MappingPanel.tsx`** — one row per `complianceTargets(kind)` entry. Each row: the target name +
  expected type; a `source` path input with a `<datalist>` of discovered source paths; a full ops
  **pipeline builder** (add op via a type menu, per-op `OpEditor`, remove, reorder up/down); an
  **"advanced (expr)"** toggle that swaps the source+ops UI for a JSONata `expr` textarea; and the
  per-target diagnostic badge from the latest preview.
- **`PreviewPanel.tsx`** — a "Test" button calling `previewResource` with the current draft
  definition, inline test params, and inline secret values; renders failure `stage`+`message`, the
  raw JSON, the transformed `envelope`, and a diagnostics summary. Emits the fetched `raw` upward
  so the mapping panel's source-path suggestions populate.
- **`frontend/components/Transformer.tsx`** (rewritten, thin orchestrator, same import path so the
  pages are unchanged): hydrates a `definition` + `secrets` draft from `getResource` (via
  `useFetch` skipped until token), owns draft state, renders the three panels, and wires **Save**
  (`saveResource` PATCH, surfacing 422 validation errors) and **Test** (shared preview state). Its
  own logic drops well under the old 707 lines.

### Adjacent page fixes

- `frontend/components/Connectors.tsx` — delete via `deleteResource`/connector delete then update
  local state (remove the row) instead of `window.location.reload()`; pass `skip: !token` to
  `useFetch`.
- `frontend/components/Connector.tsx` — pass `skip: !token` to `useFetch`.

## Error handling

- `connectorApi` throws `Error` with the backend `error` string (or joined `errors[]` for 422);
  components catch and show inline messages.
- Preview failures show `stage` + `message`; per-field problems highlight the target rows via
  `diagnosticsByTarget`.
- Save surfaces validation errors returned by `validateDefinition` (422) next to the Save button.

## Testing

- Add **vitest** (+ `@vitejs/plugin-react` not required — helpers are pure TS) to
  `frontend/package.json` with a `test` script and a `vitest.config.ts` that maps the `@/` alias.
- Unit tests for `lib/connectorDefinition.ts`: `extractSourcePaths` (bare array, nested object,
  empty), `diagnosticsByTarget` (ok/missing/wrongType/error mapping), `complianceTargets` (shape
  per kind), `emptyDefinition`.
- Backend: add tests for T1 and T2 to `backend/tests/resource.routes.test.ts` (mocked prisma,
  as in Phase 1).
- UI verified manually against the running backend + a real transit API (documented steps in the
  plan). Every element keeps light + dark variants.

## File structure

**Backend (modify):** `backend/src/routes/connector/resource.routes.ts`,
`backend/tests/resource.routes.test.ts`.

**Frontend (create):** `frontend/lib/connectorApi.ts`, `frontend/lib/connectorDefinition.ts`,
`frontend/components/connector/RequestPanel.tsx`, `MappingPanel.tsx`, `OpEditor.tsx`,
`PreviewPanel.tsx`, `frontend/vitest.config.ts`, tests under `frontend/lib/`.
**Frontend (modify):** `frontend/hooks/useFetch.ts`, `frontend/components/Transformer.tsx`,
`frontend/components/Connectors.tsx`, `frontend/components/Connector.tsx`,
`frontend/package.json`.

## Resolved decisions

- Mapping editor: **full ops pipeline builder + JSONata `expr`** escape hatch.
- Data fetching: **fix `useFetch`** (no new dependency).
- Scope: **Transformer rebuild + adjacent connector-page fixes**; two contained backend tweaks.
- Compliance schema: **bundled as a frontend constant**.
- Testing: **vitest for the pure `lib/` helpers**; manual UI verification.
- New deps: **vitest** (frontend dev) only.
