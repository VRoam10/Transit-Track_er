# Runbook — Connector Flexibility Phase 1: DB steps & coordinated release

The backend code for Phase 1 is complete and merged on `feat/connector-flexibility-backend`
(engine, schema model, migration script, routes). The steps below were **deferred** because
the Postgres dev DB was unavailable during implementation. Run them, in order, on a machine
with Docker + Postgres up. Nothing here is a code change except the two schema/migration edits
noted (steps 2 and 5).

> ⚠️ **Do not deploy the backend to an environment with the live mobile app until the
> coordinated-release items (bottom) are resolved.** The engine is correct in isolation, but
> three seams cross into the deployed clients.

## 0. Prerequisites

```bash
# start Docker Desktop, then:
docker compose up -d postgres            # Postgres on localhost:5432

# in backend/ : ensure .env has DATABASE_URL, and add an encryption key:
node -e "console.log('CONNECTOR_SECRET_KEY='+require('crypto').randomBytes(32).toString('base64'))" >> .env
```
`CONNECTOR_SECRET_KEY` must be base64 of exactly 32 bytes. The server throws on any secret
use if it is unset — set it in every environment (dev, CI, prod).

## 1. Create & apply the ConnectorResource migration

The schema already contains `ConnectorResource` + `ResourceKind` (committed). Create the
migration from it (legacy models are still present, so this is purely additive):

```bash
cd backend
npm run prisma:migrate add_connector_resource   # prisma migrate dev --name add_connector_resource
npm run prisma:generate
git add prisma/migrations && git commit -m "feat: add_connector_resource migration"
```

## 2. Run the data migration (legacy rows → ConnectorResource)

```bash
npx ts-node scripts/migrate-connectors.ts
```
It is idempotent (upsert) and logs+skips any row it can't convert. `convertResourceRow` strips
the legacy `data.` path prefix and keeps `rootPath: 'data'` (verified by
`tests/migration-integration.test.ts`).

## 3. Sanity-check the new proxy output

For a migrated connector, confirm the normalized envelope looks right per kind:
```bash
curl "http://localhost:3000/api/connector/<id>/line/proxy?offset=0"
# expect { "total_count": N, "data": [ {id,name,color}, ... ], "pagination": { "next": ... } }
```
Check line / stop / direction / nxpassage. (The old proxy routes are gone, so this is a
sanity check on the new output, not a byte-diff against the old.)

## 4. (Later, after coordinated release is settled) Drop the legacy tables

Only once mobile/web no longer depend on the old shape:
```bash
# In prisma/schema.prisma: remove models Line, Stop, Direction, NextPassage,
# their Connector relations, and Connector.apiUrl.
npm run prisma:migrate drop_legacy_resource_tables
npm run prisma:generate
# also delete the now-orphaned backend/src/utils/transform.ts (only the removed proxies used it)
```

---

## Coordinated-release items (from the whole-branch review)

These are NOT backend bugs — they are cross-codebase contract changes. Resolve before the
backend is deployed alongside the live clients.

### F1 — nxpassage envelope is now an array (affects deployed mobile)
The new engine always emits `data: [ ... ]`. The deployed mobile next-passage view
(`transit_track_er_mobile/.../connector_feature/api_call.dart`) reads nxpassage `data` as a
single `Map`. **Decide one:**
- (a) Phase 3: update the mobile nxpassage reader to take the first array element; **or**
- (b) special-case `NEXTPASSAGE` in the backend proxy to return a single object at `data`.
Lines / stops / directions are unaffected (mobile already reads those as lists).

### F3 — back-office frontend uses the old contract (Phase 2)
`frontend/components/Transformer.tsx` still PATCHes `{ name, apiUrl, transformation, params }`
and reads `apiUrl`/`transformation` from GET. The new API expects/returns `{ definition,
params, secrets }`. Back-office connector editing breaks until the Phase 2 web rebuild lands.

### F4 — deploy ordering
Apply steps 0–2 (migration + data migration + `CONNECTOR_SECRET_KEY`) **before or atomically
with** the backend code going live. Otherwise `prisma.connectorResource` queries hit a missing
table (P2021) and every resource/proxy call 500s.

## Deferred follow-ups (non-blocking, from review roll-up)
- Add a JSON error-handling middleware in `src/index.ts` (Express 5 currently returns default
  500 HTML on unexpected throws).
- Broaden unit tests flagged as thin (template missing-secret paths, secrets getKey/tamper,
  parse edge cases, validate Int/Float/Date, request page/cursor, resource proxy status map).
- `compliance.ts` `complianceFor` returns the live schema object graph — freeze/clone if a
  consumer ever mutates it.
