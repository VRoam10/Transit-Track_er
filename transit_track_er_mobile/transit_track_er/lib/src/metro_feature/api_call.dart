import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/metro_feature/metro_direction.dart';
import 'package:transit_track_er/src/metro_feature/metro_line.dart';
import 'package:transit_track_er/src/metro_feature/metro_station.dart';

Future<http.Response> fetchTestMetro(String id) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?limit=20&refine=idjdd%3A$id'));
  return response;
}

Future<List<MetroStation>> fetchAllMetro(String idLigne) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?select=nomarret%2Cidjdd%2Csens&limit=50&refine=idligne%3A%22$idLigne%22'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => MetroStation.fromJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<MetroDirection>> fetchLineDirection(String idLigne) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-parcours-td/records?select=sens%2Cnomarretarrivee&where=idligne%3D%22$idLigne%22&limit=20&refine=type%3A%22Principal%22'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => MetroDirection.fromJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

Future<List<MetroLine>> fetchAllLineMetro() async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=20'));

  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => MetroLine.fromJson(e)).toList();
  } else {
    throw Exception('Failed to load lines');
  }
}
