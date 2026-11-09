import 'package:transit_track_er/src/service/http_json.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

const _base = 'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets';

Future<List<Station>> fetchTestMetro(String id) async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-metro-circulation-deux-prochains-passages-tr/records?limit=20&refine=idjdd%3A$id'),
    errorMessage: 'Failed to load metro data',
  );
  final List data = body['results'];
  return data.map((e) => Station.fromStarJson(e)).toList();
}

Future<List<MetroStation>> fetchAllMetro(String idLigne) async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-metro-circulation-deux-prochains-passages-tr/records?select=nomarret%2Cidjdd%2Csens&limit=50&refine=idligne%3A%22$idLigne%22'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load stations',
  );
  final List data = body['results'];
  return data.map((e) => MetroStation.fromStarJson(e)).toList();
}

Future<List<MetroDirection>> fetchLineDirection(String idLigne) async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-metro-topologie-parcours-td/records?select=sens%2Cnomarretarrivee&where=idligne%3D%22$idLigne%22&limit=20&refine=type%3A%22Principal%22'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load directions',
  );
  final List data = body['results'];
  return data.map((e) => MetroDirection.fromStarJson(e)).toList();
}

Future<List<MetroLine>> fetchAllLineMetro() async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-metro-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=20'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load lines',
  );
  final List data = body['results'];
  return data.map((e) => MetroLine.fromStarJson(e)).toList();
}
