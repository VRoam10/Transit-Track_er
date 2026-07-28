# Connector Flexibility Mobile (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile next-passage against the new array envelope, cache the resource metadata (params + pagination style), normalize pagination (engine `pagination.next` for real styles / offset-increment for `none`), and auto-refresh the next-passage screen.

**Architecture:** Rewrite the `connector_feature` data layer (`api_call.dart`) around a `PagedResult` + a cached `ResourceMeta` and an injectable `http.Client` (for tests); update the lines/stops views to page on the normalized `next`; add a periodic + pull-to-refresh loop to the next-passage view. No backend changes.

**Tech Stack:** Flutter 3.19.6 / Dart 3.3.4; `http` (with `package:http/testing.dart` MockClient) + `flutter_test` (both already in `pubspec.yaml`).

## Global Constraints

- Work only in `transit_track_er_mobile/transit_track_er/`. No backend changes; no new dependencies.
- The engine envelope is `{ total_count, data: [...], pagination: { next } }` — `data` is ALWAYS an array. Next-passage uses `data.first`.
- Metadata (`params` + `pagination.style`) is read from the authenticated `GET /api/connector/:id/:kind` (Bearer token) and **cached** per `connectorId/kind` (module-level map, cleared by `clearConnectorMetaCache()` for tests).
- Proxy calls (`/:kind/proxy`) are UNauthenticated (no token header); `fetchConnectors` and the metadata lookup ARE authenticated.
- Pagination `next`: `style: 'none'` → `items.isEmpty ? null : (offset + items.length)` (offset-increment, unchanged for migrated connectors); real styles → the envelope's `pagination.next`.
- Fetch functions take an optional `http.Client? client` (default a module-level `http.Client()`) so tests inject a `MockClient`. Production behavior unchanged.
- Mobile theming rule (CLAUDE.md): use `Theme.of(context)`/framework widgets; never add hardcoded non-adaptive `Colors.*`. (The touched views use themed widgets + data-driven `line.lineColor` only.)
- Verify the data layer with `flutter test`; gate touched files with `flutter analyze`. Widgets verified manually (user-gated, needs the Phase 1 DB runbook).
- Reuse the existing `*.fromBackendJson` model factories unchanged.

## File Structure

**Modify:**
- `lib/src/connector_feature/api_call.dart` — full rewrite (PagedResult, cached ResourceMeta, injectable client, F1 fix, pagination normalization; remove `print`)
- `lib/src/connector_feature/connector_lines_view.dart` — page on `PagedResult.next`; pass token
- `lib/src/connector_feature/connector_stops_view.dart` — page on `PagedResult.next`
- `lib/src/connector_feature/connector_nxpassage_view.dart` — auto-refresh (Timer + RefreshIndicator)

**Create:**
- `test/connector_api_test.dart` — data-layer unit tests (MockClient)

**Unchanged:** `connector_directions_view.dart` (signature unchanged), `connector_list_view.dart`, `types/*`.

All commands run from `transit_track_er_mobile/transit_track_er/`.

---

## Task 1: Data layer rewrite + lines/stops pagination + tests

**Files:**
- Modify: `lib/src/connector_feature/api_call.dart`, `lib/src/connector_feature/connector_lines_view.dart`, `lib/src/connector_feature/connector_stops_view.dart`
- Create: `test/connector_api_test.dart`

**Interfaces:**
- Consumes: existing model factories `MetroLine.fromBackendJson`, `MetroDirection.fromBackendJson`, `MetroStation.fromBackendJson`, `Station.fromBackendJson`, `Connector.fromJson`; `Environment.baseUrl`.
- Produces (used by views + Task 2):
  - `class PagedResult<T> { final List<T> items; final Object? next; }`
  - `void clearConnectorMetaCache()`
  - `Future<List<Connector>> fetchConnectors(String token, {http.Client? client})`
  - `Future<PagedResult<MetroLine>> fetchConnectorLines(String connectorId, String token, {Object? position, http.Client? client})`
  - `Future<List<MetroDirection>> fetchConnectorDirections(String connectorId, String lineId, String token, {http.Client? client})`
  - `Future<PagedResult<MetroStation>> fetchConnectorStops(String connectorId, String lineId, String directionId, String token, {Object? position, http.Client? client})`
  - `Future<Station> fetchConnectorNxpassage(String connectorId, String stopId, String token, {http.Client? client})`

- [ ] **Step 1: Write the failing test file**

Create `test/connector_api_test.dart`:
```dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';

const _token = 't';
http.Response _json(Object body) =>
    http.Response(json.encode(body), 200, headers: {'content-type': 'application/json'});

void main() {
  setUp(clearConnectorMetaCache);

  group('fetchConnectorNxpassage (F1 array envelope)', () {
    final station = {
      'id': 's1', 'lineId': 'M1', 'direction': 0, 'name': 'Stop',
      'coordonnees': {'lat': 1.0, 'lon': 2.0},
      'nextTrain': '2026-01-01T00:00:00.000Z', 'extraction': '2026-01-01T00:00:00.000Z',
    };

    test('parses the first element of the data array', () async {
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) {
          return _json({'data': [station], 'pagination': {'next': null}});
        }
        return _json({'params': ['stopId'], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      final s = await fetchConnectorNxpassage('c1', 's1', _token, client: client);
      expect(s.idjdd, 's1');
      expect(s.nomArret, 'Stop');
    });

    test('throws when the data array is empty', () async {
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': []});
        return _json({'params': ['stopId'], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      expect(() => fetchConnectorNxpassage('c1', 's1', _token, client: client),
          throwsA(isA<Exception>()));
    });
  });

  group('fetchConnectorLines pagination', () {
    final line = {'id': 'M1', 'name': 'Metro 1', 'color': '#ff0000'};

    test('offset style surfaces the engine pagination.next', () async {
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': [line], 'pagination': {'next': 50}});
        return _json({'params': [], 'definition': {'request': {'pagination': {'style': 'offset'}}}});
      });
      final r = await fetchConnectorLines('c1', _token, client: client);
      expect(r.items.length, 1);
      expect(r.items.first.shortName, 'Metro 1');
      expect(r.next, 50);
    });

    test('none style synthesizes next = position + count, null on empty', () async {
      var empty = false;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': empty ? [] : [line]});
        return _json({'params': [], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      final r1 = await fetchConnectorLines('c1', _token, client: client);
      expect(r1.next, 1);
      empty = true;
      final r2 = await fetchConnectorLines('c1', _token, position: 1, client: client);
      expect(r2.next, null);
    });
  });

  group('fetchConnectorStops param mapping', () {
    final stop = {'id': 's1', 'name': 'Stop 1', 'direction': 0};
    test('maps line/direction params + offset from cached meta', () async {
      Uri? proxyUri;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) {
          proxyUri = req.url;
          return _json({'data': [stop], 'pagination': {'next': null}});
        }
        return _json({'params': ['lineParam', 'dirParam'], 'definition': {'request': {'pagination': {'style': 'offset'}}}});
      });
      final r = await fetchConnectorStops('c1', 'L1', 'D1', _token, client: client);
      expect(r.items.length, 1);
      expect(proxyUri!.queryParameters['lineParam'], 'L1');
      expect(proxyUri!.queryParameters['dirParam'], 'D1');
      expect(proxyUri!.queryParameters['offset'], '0');
    });
  });

  group('metadata cache', () {
    final line = {'id': 'M1', 'name': 'Metro 1', 'color': '#fff'};
    test('fetches the GET /:kind config only once across calls', () async {
      var metaHits = 0;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': [line]});
        metaHits++;
        return _json({'params': [], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      await fetchConnectorLines('c1', _token, client: client);
      await fetchConnectorLines('c1', _token, position: 1, client: client);
      expect(metaHits, 1);
    });
  });

  group('fetchConnectorDirections', () {
    final dir = {'id': 0, 'name': 'North'};
    test('parses the data array with the mapped param', () async {
      Uri? proxyUri;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) {
          proxyUri = req.url;
          return _json({'data': [dir]});
        }
        return _json({'params': ['lineParam'], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      final list = await fetchConnectorDirections('c1', 'L1', _token, client: client);
      expect(list.length, 1);
      expect(list.first.nomarretarrivee, 'North');
      expect(proxyUri!.queryParameters['lineParam'], 'L1');
    });
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test test/connector_api_test.dart`
Expected: FAIL — compile errors (`PagedResult`, `clearConnectorMetaCache`, the new signatures don't exist yet in `api_call.dart`).

- [ ] **Step 3: Rewrite `lib/src/connector_feature/api_call.dart`**

```dart
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

final http.Client _defaultClient = http.Client();

/// A page of results plus the position to request for the next page.
/// [next] is null when there are no more pages.
class PagedResult<T> {
  final List<T> items;
  final Object? next;
  const PagedResult(this.items, this.next);
}

/// Cached per-resource configuration: the required query-param names (in order)
/// and the pagination style, read once from the authenticated GET /:kind.
class ResourceMeta {
  final List<String> params;
  final String style;
  const ResourceMeta(this.params, this.style);
}

final Map<String, ResourceMeta> _metaCache = {};

/// Test hook: reset the metadata cache between cases.
void clearConnectorMetaCache() => _metaCache.clear();

String _extractStyle(Map<String, dynamic> data) {
  final def = data['definition'];
  if (def is Map) {
    final req = def['request'];
    if (req is Map) {
      final pg = req['pagination'];
      if (pg is Map && pg['style'] is String) return pg['style'] as String;
    }
  }
  return 'none';
}

Future<ResourceMeta> _fetchResourceMeta(
    String connectorId, String kind, String token, http.Client client) async {
  final key = '$connectorId/$kind';
  final cached = _metaCache[key];
  if (cached != null) return cached;

  final response = await client.get(
    Uri.parse('${Environment.baseUrl}/api/connector/$connectorId/$kind'),
    headers: {'Authorization': 'Bearer $token'},
  );
  if (response.statusCode != 200) {
    throw Exception('Failed to load $kind config');
  }
  final data = json.decode(response.body) as Map<String, dynamic>;
  final rawParams = data['params'];
  final params = rawParams is List ? List<String>.from(rawParams) : <String>[];
  final meta = ResourceMeta(params, _extractStyle(data));
  _metaCache[key] = meta;
  return meta;
}

/// Canonical pagination query params for a given style + position.
Map<String, String> _pageQuery(String style, Object? position) {
  switch (style) {
    case 'page':
      return position == null ? {} : {'page': position.toString()};
    case 'cursor':
      return position == null ? {} : {'cursor': position.toString()};
    default: // 'offset' and 'none' both use the offset param
      return {'offset': (position is int ? position : 0).toString()};
  }
}

/// Normalize the next-page position: synthesize for 'none', trust the engine otherwise.
Object? _computeNext(String style, Object? position, int itemCount, dynamic rawNext) {
  if (style == 'none') {
    if (itemCount == 0) return null;
    final off = position is int ? position : 0;
    return off + itemCount;
  }
  return rawNext; // int | String | null
}

Future<List<Connector>> fetchConnectors(String token, {http.Client? client}) async {
  final c = client ?? _defaultClient;
  final response = await c.get(
    Uri.parse('${Environment.baseUrl}/api/connector'),
    headers: {'Authorization': 'Bearer $token'},
  );
  if (response.statusCode == 200) {
    final List data = json.decode(response.body) as List;
    return data.map((e) => Connector.fromJson(e as Map<String, dynamic>)).toList();
  } else {
    throw Exception('Failed to load connectors');
  }
}

Future<PagedResult<MetroLine>> fetchConnectorLines(String connectorId, String token,
    {Object? position, http.Client? client}) async {
  final c = client ?? _defaultClient;
  final meta = await _fetchResourceMeta(connectorId, 'line', token, c);
  final uri = Uri.parse('${Environment.baseUrl}/api/connector/$connectorId/line/proxy')
      .replace(queryParameters: _pageQuery(meta.style, position));
  final response = await c.get(uri);
  if (response.statusCode != 200) throw Exception('Failed to load lines');
  final body = json.decode(response.body) as Map<String, dynamic>;
  final List data = body['data'] as List;
  final items = data.map((e) => MetroLine.fromBackendJson(e as Map<String, dynamic>)).toList();
  final rawNext = (body['pagination'] as Map<String, dynamic>?)?['next'];
  return PagedResult(items, _computeNext(meta.style, position, items.length, rawNext));
}

Future<List<MetroDirection>> fetchConnectorDirections(
    String connectorId, String lineId, String token, {http.Client? client}) async {
  final c = client ?? _defaultClient;
  final meta = await _fetchResourceMeta(connectorId, 'direction', token, c);
  final query = <String, String>{};
  if (meta.params.isNotEmpty) query[meta.params[0]] = lineId;
  final uri = Uri.parse('${Environment.baseUrl}/api/connector/$connectorId/direction/proxy')
      .replace(queryParameters: query.isNotEmpty ? query : null);
  final response = await c.get(uri);
  if (response.statusCode != 200) throw Exception('Failed to load directions');
  final body = json.decode(response.body) as Map<String, dynamic>;
  final List data = body['data'] as List;
  return data.map((e) => MetroDirection.fromBackendJson(e as Map<String, dynamic>)).toList();
}

Future<PagedResult<MetroStation>> fetchConnectorStops(
    String connectorId, String lineId, String directionId, String token,
    {Object? position, http.Client? client}) async {
  final c = client ?? _defaultClient;
  final meta = await _fetchResourceMeta(connectorId, 'stop', token, c);
  final query = _pageQuery(meta.style, position);
  if (meta.params.isNotEmpty) query[meta.params[0]] = lineId;
  if (meta.params.length > 1) query[meta.params[1]] = directionId;
  final uri = Uri.parse('${Environment.baseUrl}/api/connector/$connectorId/stop/proxy')
      .replace(queryParameters: query);
  final response = await c.get(uri);
  if (response.statusCode != 200) throw Exception('Failed to load stops');
  final body = json.decode(response.body) as Map<String, dynamic>;
  final List data = body['data'] as List;
  final items = data.map((e) => MetroStation.fromBackendJson(e as Map<String, dynamic>)).toList();
  final rawNext = (body['pagination'] as Map<String, dynamic>?)?['next'];
  return PagedResult(items, _computeNext(meta.style, position, items.length, rawNext));
}

Future<Station> fetchConnectorNxpassage(
    String connectorId, String stopId, String token, {http.Client? client}) async {
  final c = client ?? _defaultClient;
  final meta = await _fetchResourceMeta(connectorId, 'nxpassage', token, c);
  final query = <String, String>{};
  if (meta.params.isNotEmpty) query[meta.params[0]] = stopId;
  final uri = Uri.parse('${Environment.baseUrl}/api/connector/$connectorId/nxpassage/proxy')
      .replace(queryParameters: query.isNotEmpty ? query : null);
  final response = await c.get(uri);
  if (response.statusCode != 200) throw Exception('Failed to load next passage');
  final body = json.decode(response.body) as Map<String, dynamic>;
  final List data = body['data'] as List;
  if (data.isEmpty) throw Exception('No next passage data');
  return Station.fromBackendJson(data.first as Map<String, dynamic>);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `flutter test test/connector_api_test.dart`
Expected: PASS — all groups green. (The views still reference old signatures; that's fixed in Step 5. `flutter test` on this file does not compile the views.)

- [ ] **Step 5: Update the lines + stops views to the new signatures**

Replace the ENTIRE file `lib/src/connector_feature/connector_lines_view.dart` (full overwrite — this is robust to whatever the current file contains):
```dart
import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_directions_view.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/types/metro_line.dart';

class ConnectorLinesView extends StatefulWidget {
  const ConnectorLinesView({
    super.key,
    required this.connector,
    required this.token,
  });

  final Connector connector;
  final String token;

  @override
  State<ConnectorLinesView> createState() => _ConnectorLinesViewState();
}

class _ConnectorLinesViewState extends State<ConnectorLinesView> {
  final List<MetroLine> _lines = [];
  Object? _position;
  bool _isLoading = false;
  bool _hasMore = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMore();
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await fetchConnectorLines(
        widget.connector.id,
        widget.token,
        position: _position,
      );
      setState(() {
        _lines.addAll(result.items);
        _position = result.next;
        _hasMore = result.next != null;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.connector.name)),
      body: _lines.isEmpty && _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _lines.isEmpty && _error != null
              ? Center(child: Text('Error: $_error'))
              : _lines.isEmpty
                  ? const Center(child: Text('No lines found'))
                  : ListView.builder(
                      itemCount: _lines.length + (_hasMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _lines.length) {
                          return _isLoading
                              ? const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                      child: CircularProgressIndicator()),
                                )
                              : TextButton(
                                  onPressed: _loadMore,
                                  child: const Text('Load more'),
                                );
                        }
                        final line = _lines[index];
                        return ListTile(
                          leading: Icon(Icons.circle, color: line.lineColor),
                          title: Text(line.shortName),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ConnectorDirectionsView(
                                  connectorId: widget.connector.id,
                                  line: line,
                                  token: widget.token,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
    );
  }
}
```

Replace the ENTIRE file `lib/src/connector_feature/connector_stops_view.dart` (full overwrite):
```dart
import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_nxpassage_view.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';

class ConnectorStopsView extends StatefulWidget {
  const ConnectorStopsView({
    super.key,
    required this.connectorId,
    required this.line,
    required this.direction,
    required this.token,
  });

  final String connectorId;
  final MetroLine line;
  final MetroDirection direction;
  final String token;

  @override
  State<ConnectorStopsView> createState() => _ConnectorStopsViewState();
}

class _ConnectorStopsViewState extends State<ConnectorStopsView> {
  final List<MetroStation> _stops = [];
  Object? _position;
  bool _isLoading = false;
  bool _hasMore = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMore();
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await fetchConnectorStops(
        widget.connectorId,
        widget.line.id,
        widget.direction.sens.toString(),
        widget.token,
        position: _position,
      );
      setState(() {
        _stops.addAll(result.items);
        _position = result.next;
        _hasMore = result.next != null;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
            '${widget.line.shortName} → ${widget.direction.nomarretarrivee}'),
      ),
      body: _stops.isEmpty && _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _stops.isEmpty && _error != null
              ? Center(child: Text('Error: $_error'))
              : _stops.isEmpty
                  ? const Center(child: Text('No stops found'))
                  : ListView.builder(
                      itemCount: _stops.length + (_hasMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _stops.length) {
                          return _isLoading
                              ? const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                      child: CircularProgressIndicator()),
                                )
                              : TextButton(
                                  onPressed: _loadMore,
                                  child: const Text('Load more'),
                                );
                        }
                        final stop = _stops[index];
                        return ListTile(
                          leading: const Icon(Icons.pin_drop),
                          title: Text(stop.name),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ConnectorNxpassageView(
                                  connectorId: widget.connectorId,
                                  stop: stop,
                                  token: widget.token,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
    );
  }
}
```

- [ ] **Step 6: Verify analyze + tests**

Run: `flutter analyze lib/src/connector_feature/ test/connector_api_test.dart`
Expected: "No issues found!" for the touched files.
Run: `flutter test test/connector_api_test.dart`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/src/connector_feature/api_call.dart lib/src/connector_feature/connector_lines_view.dart lib/src/connector_feature/connector_stops_view.dart test/connector_api_test.dart
git commit -m "feat: rework connector data layer (cached meta, paged results, nxpassage array fix)"
```

---

## Task 2: Next-passage auto-refresh

**Files:**
- Modify: `lib/src/connector_feature/connector_nxpassage_view.dart`

**Interfaces:**
- Consumes: `fetchConnectorNxpassage(connectorId, stopId, token, {client})` → `Station` (Task 1), `MetroDetailsView` (from `types/station.dart`).

- [ ] **Step 1: Rewrite `connector_nxpassage_view.dart`**

```dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

class ConnectorNxpassageView extends StatefulWidget {
  const ConnectorNxpassageView({
    super.key,
    required this.connectorId,
    required this.stop,
    required this.token,
  });

  final String connectorId;
  final MetroStation stop;
  final String token;

  @override
  State<ConnectorNxpassageView> createState() => _ConnectorNxpassageViewState();
}

class _ConnectorNxpassageViewState extends State<ConnectorNxpassageView> {
  Station? _passage;
  String? _error;
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final p = await fetchConnectorNxpassage(
          widget.connectorId, widget.stop.id, widget.token);
      if (!mounted) return;
      setState(() {
        _passage = p;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.stop.name)),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    // Only show the spinner on the very first load; periodic refreshes keep
    // the existing data on screen instead of flashing a spinner.
    if (_loading && _passage == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_passage == null) {
      // Error/empty states are scrollable so pull-to-refresh still works.
      return ListView(
        children: [
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(_error != null ? 'Error: $_error' : 'No passage data found'),
            ),
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [MetroDetailsView(metro: _passage!)],
    );
  }
}
```

- [ ] **Step 2: Verify analyze**

Run: `flutter analyze lib/src/connector_feature/connector_nxpassage_view.dart`
Expected: "No issues found!"
Run: `flutter test test/connector_api_test.dart`
Expected: PASS (unchanged).

- [ ] **Step 3: Commit**

```bash
git add lib/src/connector_feature/connector_nxpassage_view.dart
git commit -m "feat: auto-refresh connector next-passage (periodic + pull-to-refresh)"
```

---

## Notes for the executor

- Run all commands from `transit_track_er_mobile/transit_track_er/`.
- Task 1's `flutter test` goes green (Step 4) before the views are updated because the test imports only `api_call.dart`, not the views; `flutter analyze` (Step 6) is what requires the view call-sites fixed. Keep both steps.
- The user has uncommitted edits to `api_call.dart` and `connector_stops_view.dart` on `dev` — the worktree is branched from `dev`, so those edits are NOT present in the worktree (they were never committed). Implement against the committed versions shown here; if the worktree's files differ from the code above, follow the plan's code (it's written against the committed state).
- Manual UI verification (auto-refresh timer visibly updating, Load-more paging, next-passage rendering) needs the running stack + Phase 1 DB runbook — user-gated, not part of these tasks.
