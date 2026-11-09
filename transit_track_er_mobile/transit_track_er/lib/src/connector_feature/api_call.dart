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
