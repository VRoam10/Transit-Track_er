import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/types/bus_direction.dart';
import 'package:transit_track_er/src/types/bus_line.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';

Future<BusStop> fetchNextPassageBus(String id, String idLigne) async {
  final response = await http.get(
      Uri.parse('${Environment.baseUrl}/api/bus/nextpassages/$id-$idLigne'));
  if (response.statusCode == 200) {
    final Map<String, dynamic> data = json.decode(response.body)['data'];
    return BusStop.fromBackendJson(data);
  } else {
    throw Exception('Failed to load bus stops');
  }
}

Future<List<BusServicePoint>> fetchAllBusLigne(
    String idLigne, int direction) async {
  final response = await http.get(
      Uri.parse('${Environment.baseUrl}/api/bus/stops/$idLigne/$direction'));
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => BusServicePoint.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<BusRouteDirection>> fetchLineDirection(String idLigne) async {
  final response = await http
      .get(Uri.parse('${Environment.baseUrl}/api/bus/directions/$idLigne'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => BusRouteDirection.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<BusLine>> fetchAllLineBus() async {
  final response =
      await http.get(Uri.parse('${Environment.baseUrl}/api/bus/lines'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => BusLine.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load lines');
  }
}
