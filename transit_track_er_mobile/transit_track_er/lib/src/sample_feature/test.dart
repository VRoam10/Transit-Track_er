import 'dart:convert';

import 'package:http/http.dart' as http;

Future<http.Response> fetchTestMetro(String id) async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?limit=20&refine=idjdd%3A$id&refine=idligne%3A%221001%22'));
  return response;
}

Future<List<MetroStation>> fetchAllMetro() async {
  final response = await http.get(Uri.parse(
      'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?select=nomarret%2Cidjdd&limit=20&refine=idligne%3A%221001%22'));
  
  if (response.statusCode == 200) {
    final List data = json.decode(response.body)['results'];
    return data.map((e) => MetroStation.fromJson(e)).toList();
  } else {
    throw Exception('Failed to load stations');
  }
}

class MetroStation {
  final String id;
  final String name;

  MetroStation({required this.id, required this.name});

  factory MetroStation.fromJson(Map<String, dynamic> json) {
    return MetroStation(
      id: json['idjdd'],
      name: json['nomarret'],
    );
  }
}