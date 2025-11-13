import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/types/bus_direction.dart';
import 'package:transit_track_er/src/types/bus_line.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';

Future<List<BusStop>> fetchNextPassageBus(String id, String idLigne) async {
  final response = await http.get(
      Uri.parse('${Environment.baseUrl}/api/bus/nextpassages/$id-$idLigne'));
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => BusStop.fromStarJson(e)).toList();
  } else {
    throw Exception('Failed to load bus stops');
  }
}

Future<List<BusServicePoint>> fetchAllBusLigne(String idLigne) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-circulation-passages-tr/records?group_by=idligne%2Cnomcourtligne%2Cidarret%2Csens%2Cnomarret&limit=100&refine=idligne%3A%22$idLigne%22'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => BusServicePoint.fromStarJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<BusRouteDirection>> fetchLineDirection(String idLigne) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-parcours-td/records?select=sens%2Cnomarretarrivee&where=idligne%3D%22$idLigne%22&limit=20&refine=type%3A%22Principal%22'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => BusRouteDirection.fromStarJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<BusLine>> fetchAllLineBus() async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=50'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => BusLine.fromStarJson(e)).toList();
  } else {
    throw Exception('Failed to load lines');
  }
}
