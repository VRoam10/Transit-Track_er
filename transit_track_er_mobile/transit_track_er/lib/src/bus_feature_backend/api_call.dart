import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/service/http_json.dart';
import 'package:transit_track_er/src/types/bus_direction.dart';
import 'package:transit_track_er/src/types/bus_line.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';

Future<BusStop> fetchNextPassageBus(String id, String idLigne) async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/bus/nextpassages/$id-$idLigne'),
    errorMessage: 'Failed to load bus stops',
  );
  return BusStop.fromBackendJson(body['data']);
}

Future<List<BusServicePoint>> fetchAllBusLigne(
    String idLigne, int direction) async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/bus/stops/$idLigne/$direction'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load stations',
  );
  final List data = body['data'];
  return data.map((e) => BusServicePoint.fromBackendJson(e)).toList();
}

Future<List<BusRouteDirection>> fetchLineDirection(String idLigne) async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/bus/directions/$idLigne'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load directions',
  );
  final List data = body['data'];
  return data.map((e) => BusRouteDirection.fromBackendJson(e)).toList();
}

Future<List<BusLine>> fetchAllLineBus() async {
  final body = await getJson(
    Uri.parse('${Environment.baseUrl}/api/bus/lines'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load lines',
  );
  final List data = body['data'];
  return data.map((e) => BusLine.fromBackendJson(e)).toList();
}
