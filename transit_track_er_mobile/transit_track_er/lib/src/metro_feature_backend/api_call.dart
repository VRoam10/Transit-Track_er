import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

Future<List<Station>> fetchNextPassageMetro(String id) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?limit=20&refine=idjdd%3A$id'));
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => Station.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load metro data');
  }
}

Future<List<MetroStation>> fetchAllMetro(String idLigne) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?select=nomarret%2Cidjdd%2Csens&limit=50&refine=idligne%3A%22$idLigne%22'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => MetroStation.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<MetroDirection>> fetchLineDirection(String idLigne) async {
  final response = await http.get(
      Uri.parse('${Environment.baseUrl}/api/metro/lines/directions/$idLigne'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => MetroDirection.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<MetroLine>> fetchAllLineMetro() async {
  final response =
      await http.get(Uri.parse('${Environment.baseUrl}/api/metro/lines'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['data'];
    return data.map((e) => MetroLine.fromBackendJson(e)).toList();
  } else {
    throw Exception('Failed to load lines');
  }
}
