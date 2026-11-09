# Connector Flexibility Redesign — Phase 3: Mobile

- **Date:** 2026-07-24
- **Status:** Approved design, ready for implementation planning
- **Depends on:** Phase 1 (backend engine) + Phase 2 (web) — both merged to `dev`.
- **Scope:** Flutter mobile connector feature only (`lib/src/connector_feature/`). No backend changes.

## Problem

The mobile connector drill-down mostly still works against the new backend (lines/stops/
directions go through the metadata lookup + unauthenticated proxy), but:

1. **Next-passage is broken (must-fix).** `api_call.dart:110` reads `body['data']` as a
   `Map<String,dynamic>`, but the Phase-1 engine now returns a uniform envelope where `data`
   is always an **array**. Casting the array to a Map throws → "Failed to load next passage."
2. **Metadata round-trip is re-fetched wastefully.** `_fetchResourceParams`
   (`api_call.dart:24`) is called on every directions/stops/nxpassage fetch — and again on
   every stops pagination page (`api_call.dart:76`) — so paging K pages costs ~2K requests.
3. **Pagination does a wasted empty request** and can't use the engine's `pagination.next`.
4. **Next-passage goes stale** — fetched once in `initState`, never refreshed, though arrival
   times are inherently time-sensitive.
5. A leftover `print(uri)` runs on every stops fetch (`api_call.dart:86`).

## Goals

1. Fix the next-passage envelope (read `data` as an array, use the first element).
2. Cache the resource metadata (params + pagination style) per `(connectorId, kind)` so it is
   fetched once per session, not per page/navigation.
3. Use the engine's `pagination.next` when the connector uses a real pagination style; fall
   back to offset-increment for migrated `style: 'none'` connectors — no regression for
   existing connectors, cleaner paging for new ones.
4. Auto-refresh the next-passage screen (periodic + pull-to-refresh).
5. Make the data layer unit-testable (`flutter test` with a mocked HTTP client) and keep
   `flutter analyze` clean.

## Non-goals (Phase 3)

- Backend changes (the proxy already reads canonical `offset`/`page`/`cursor` and returns the
  `{ total_count, data, pagination:{next} }` envelope).
- **Full canonical params** (mobile sending `lineId`/`directionId`/`stopId` with no metadata
  lookup) — that requires re-authoring every connector's definition to use canonical tokens
  (the migration used external names). Deliberately deferred; caching the lookup achieves the
  efficiency goal without a coordinated data change.
- Infinite-scroll (keep the existing "Load more" button); shared-client perf tuning beyond the
  injectable client needed for tests; `compute()` isolate offload.
- The legacy `bus_feature`/`metro_feature` code (out of scope).

## Data layer — `lib/src/connector_feature/api_call.dart` (rewrite)

### Result + metadata types

```dart
class PagedResult<T> {
  final List<T> items;
  final Object? next; // position to request next page; null = no more
  PagedResult(this.items, this.next);
}

class _ResourceMeta {
  final List<String> params;   // required query-param names, in order
  final String style;          // pagination.style: 'none'|'offset'|'page'|'cursor'
  _ResourceMeta(this.params, this.style);
}
```

### Cached metadata

Replace `_fetchResourceParams` with:

```dart
final Map<String, _ResourceMeta> _metaCache = {};

Future<_ResourceMeta> _fetchResourceMeta(
    String connectorId, String kind, String token, http.Client client) async { ... }
```

- Key: `'$connectorId/$kind'`. On a cache hit, return without a request.
- On a miss: `GET /api/connector/$connectorId/$kind` with the Bearer token (authenticated,
  ownership-checked). Parse `data['params']` (List<String>) and
  `data['definition']['request']['pagination']['style']` (default `'none'` if absent). Store
  and return.
- A `clearConnectorMetaCache()` helper is exported for tests (reset between cases).

### Injectable HTTP client (for tests)

Every fetch function takes an optional `http.Client? client` and uses it (or a module-level
default `http.Client()`), so `flutter test` can inject a `MockClient`
(`package:http/testing.dart`). No production behavior change.

### Fetch functions

- `fetchConnectors(token, {client})` → `List<Connector>` — unchanged (already correct).
- `fetchConnectorLines(connectorId, token, {Object? position, client})` → `PagedResult<MetroLine>`
  — fetches cached meta (for `style`), builds the paged request (see Pagination), parses
  `body['data']` (array) → `MetroLine.fromBackendJson`, and computes `next` (see Pagination).
- `fetchConnectorDirections(connectorId, lineId, token, {client})` → `List<MetroDirection>`
  — cached meta for the param name; single request; parses `body['data']` array. (Not paginated.)
- `fetchConnectorStops(connectorId, lineId, directionId, token, {Object? position, client})`
  → `PagedResult<MetroStation>` — cached meta (params[0]=line, params[1]=direction, + style);
  paged; parses `body['data']` array.
- `fetchConnectorNxpassage(connectorId, stopId, token, {client})` → `Station` — cached meta for
  the param; **F1 fix:** `final List data = body['data']; if (data.isEmpty) throw Exception('No
  next passage data'); return Station.fromBackendJson(data.first as Map<String,dynamic>);`

Remove the `print(uri)` line.

### Pagination normalization

`position` is the opaque page position (`int` offset/page, or `String` cursor; `null` = first
page). Given the cached `style`:

- **Request** (canonical query params the Phase-1 proxy reads):
  - `none` / `offset`: send `offset = (position as int?) ?? 0`.
  - `page`: send `page = position` only when non-null (first page omits it → backend uses `startPage`).
  - `cursor`: send `cursor = position` only when non-null.
  - Plus the resource's mapped params (stops: line/direction) from the cached meta.
- **`next`** returned in `PagedResult`:
  - `none`: `items.isEmpty ? null : ((position as int?) ?? 0) + items.length` (offset-increment +
    stop-on-empty — the current behavior, unchanged for migrated connectors).
  - `offset`/`page`/`cursor`: `body['pagination']?['next']` (the engine's computed next; `null`
    on the last page → stop cleanly, no wasted request).

## View changes (`lib/src/connector_feature/`)

- **`connector_lines_view.dart`** / **`connector_stops_view.dart`:** replace the `int _offset`
  with `Object? _position` (seeded `null`). `_loadMore` calls the fetch with `position: _position`,
  appends `result.items`, sets `_position = result.next` and `_hasMore = result.next != null`.
  Lines passes `widget.token` to `fetchConnectorLines` (new arg). Everything else (the
  `ListView.builder` + "Load more" button, error/empty states) stays.
- **`connector_directions_view.dart`:** no change beyond the (unchanged) `fetchConnectorDirections`
  signature — it just benefits from the cached meta internally.
- **`connector_nxpassage_view.dart`:** add **auto-refresh** — keep the initial fetch, add a
  `Timer.periodic(Duration(seconds: 30), ...)` that re-fetches and `setState`s the latest
  `Station`, wrap the body in a `RefreshIndicator` for pull-to-refresh, and cancel the timer in
  `dispose()`. Show the last-updated state without tearing down the screen on refresh (don't
  flash a spinner over existing data on the periodic refresh).

## Error handling

- Fetch functions throw `Exception` with a clear message on non-200 or malformed payloads
  (unchanged pattern); views render the message in their existing error state.
- Nxpassage empty `data` array throws "No next passage data" rather than crashing on `.first`.

## Testing

- `flutter test test/connector_api_test.dart` using `MockClient` (`package:http/testing.dart`)
  injected as the `client` arg. Cases:
  - **nxpassage F1:** `{data:[{...}]}` → `Station` from `data[0]`; `{data:[]}` → throws.
  - **lines/stops:** parse `data` array into models; `body['pagination'].next` surfaced as
    `PagedResult.next` for a real style; `none`-style synthesizes `next = offset + len` (and
    `null` on an empty page).
  - **param mapping:** stops sends the cached param names mapped to lineId/directionId plus the
    style-appropriate position param.
  - **metadata cache:** repeated fetches for the same `(connector, kind)` hit `GET /:kind` only
    once (count MockClient invocations); `clearConnectorMetaCache()` resets it.
  - **directions:** parse `data` array.
- `flutter analyze` is the static gate (must be clean for touched files).
- Widgets (auto-refresh timer, Load-more) verified manually against the running stack (needs
  the Phase 1 DB runbook: Postgres + migration + a connector). Manual verification is
  user-gated, same as Phases 1–2.

## File structure

**Modify:** `lib/src/connector_feature/api_call.dart` (rewrite),
`lib/src/connector_feature/connector_lines_view.dart`,
`lib/src/connector_feature/connector_stops_view.dart`,
`lib/src/connector_feature/connector_nxpassage_view.dart`.
**Create:** `test/connector_api_test.dart`.
**Unchanged:** `connector_directions_view.dart`, `connector_list_view.dart`, the `types/*`
models (their `fromBackendJson` factories are reused as-is).

## Resolved decisions

- Metadata: **cache per (connector, kind)** (params + pagination style); no full-canonical rework.
- Pagination: **`pagination.next` for real styles, offset-increment for `none`**, normalized in
  the data layer so views loop on a single `next`.
- Extras: **auto-refresh next-passage** (periodic + pull-to-refresh); remove the debug `print`.
  (Shared-client perf tuning and `compute()` offload were declined; an injectable client is
  included only because the chosen test approach requires it.)
- Testing: **`flutter test` (mocked HTTP) for the data layer + `flutter analyze`**; manual for widgets.
- No new dependencies (`http`, `flutter_test` already present; `MockClient` ships with `http`).
