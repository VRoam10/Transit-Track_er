import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/service/http_json.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

Future<Station> fetchNextPassageMetro(String id) async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/metro/nextpassages/$id'),
    errorMessage: 'Failed to load metro data',
  );
  return Station.fromBackendJson(body['data']);
}

Future<List<MetroStation>> fetchAllMetroStation(
    String idLigne, int direction) async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/metro/stops/$idLigne/$direction'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load stations',
  );
  final List data = body['data'];
  return data.map((e) => MetroStation.fromBackendJson(e)).toList();
}

Future<List<MetroDirection>> fetchLineDirection(String idLigne) async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/metro/directions/$idLigne'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load directions',
  );
  final List data = body['data'];
  return data.map((e) => MetroDirection.fromBackendJson(e)).toList();
}

Future<List<MetroLine>> fetchAllLineMetro() async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/metro/lines'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load lines',
  );
  final List data = body['data'];
  return data.map((e) => MetroLine.fromBackendJson(e)).toList();
}
