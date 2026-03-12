import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

Future<List<Connector>> fetchConnectors(String token) async {
  final response = await http.get(
    Uri.parse('${Environment.baseUrl}/api/connector'),
    headers: {'Authorization': 'Bearer $token'},
  );
  if (response.statusCode == 200) {
    final List data = json.decode(response.body);
    return data.map((e) => Connector.fromJson(e)).toList();
  } else {
    throw Exception('Failed to load connectors');
  }
}

Future<List<String>> _fetchResourceParams(
    String connectorId, String resource, String token) async {
  final response = await http.get(
    Uri.parse('${Environment.baseUrl}/api/connector/$connectorId/$resource'),
    headers: {'Authorization': 'Bearer $token'},
  );
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    final params = data['params'];
    if (params is List) return List<String>.from(params);
  }
  return [];
}

Future<List<MetroLine>> fetchConnectorLines(String connectorId,
    {int offset = 0}) async {
  final uri = Uri.parse(
          '${Environment.baseUrl}/api/connector/$connectorId/line/proxy')
      .replace(queryParameters: {'offset': offset.toString()});

  final response = await http.get(uri);
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => MetroLine.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load lines');
  }
}

Future<List<MetroDirection>> fetchConnectorDirections(
    String connectorId, String lineId, String token) async {
  final params =
      await _fetchResourceParams(connectorId, 'direction', token);

  final queryParams = <String, String>{};
  if (params.isNotEmpty) queryParams[params[0]] = lineId;

  final uri = Uri.parse(
          '${Environment.baseUrl}/api/connector/$connectorId/direction/proxy')
      .replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

  final response = await http.get(uri);
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => MetroDirection.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load directions');
  }
}

Future<List<MetroStation>> fetchConnectorStops(
    String connectorId, String lineId, String directionId, String token,
    {int offset = 0}) async {
  final params = await _fetchResourceParams(connectorId, 'stop', token);

  final queryParams = <String, String>{'offset': offset.toString()};
  if (params.isNotEmpty) queryParams[params[0]] = lineId;
  if (params.length > 1) queryParams[params[1]] = directionId;

  final uri = Uri.parse(
          '${Environment.baseUrl}/api/connector/$connectorId/stop/proxy')
      .replace(queryParameters: queryParams);

  final response = await http.get(uri);
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => MetroStation.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load stops');
  }
}

Future<Station> fetchConnectorNxpassage(
    String connectorId, String stopId, String token) async {
  final params =
      await _fetchResourceParams(connectorId, 'nxpassage', token);

  final queryParams = <String, String>{};
  if (params.isNotEmpty) queryParams[params[0]] = stopId;

  final uri = Uri.parse(
          '${Environment.baseUrl}/api/connector/$connectorId/nxpassage/proxy')
      .replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

  final response = await http.get(uri);
  if (response.statusCode == 200) {
    final Map<String, dynamic> data = json.decode(response.body)['data'];
    return Station.fromBackendJson(data);
  } else {
    throw Exception('Failed to load next passage');
  }
}
