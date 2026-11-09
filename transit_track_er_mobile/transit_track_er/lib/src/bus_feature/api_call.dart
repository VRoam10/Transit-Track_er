import 'package:transit_track_er/src/service/http_json.dart';
import 'package:transit_track_er/src/types/bus_direction.dart';
import 'package:transit_track_er/src/types/bus_line.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';

const _base = 'https://data.explore.star.fr/api/explore/v2.1/catalog/datasets';

Future<List<BusStop>> fetchTestBus(String id, String idLigne) async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-bus-circulation-passages-tr/records?limit=20&refine=idarret%3A$id&refine=idligne%3A%22$idLigne%22'),
    errorMessage: 'Failed to load bus stops',
  );
  final List data = body['results'];
  return data.map((e) => BusStop.fromStarJson(e)).toList();
}

Future<List<BusServicePoint>> fetchAllBusLigne(String idLigne) async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-bus-circulation-passages-tr/records?group_by=idligne%2Cnomcourtligne%2Cidarret%2Csens%2Cnomarret&limit=100&refine=idligne%3A%22$idLigne%22'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load stations',
  );
  final List data = body['results'];
  return data.map((e) => BusServicePoint.fromStarJson(e)).toList();
}

Future<List<BusRouteDirection>> fetchLineDirection(String idLigne) async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-bus-topologie-parcours-td/records?select=sens%2Cnomarretarrivee&where=idligne%3D%22$idLigne%22&limit=20&refine=type%3A%22Principal%22'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load directions',
  );
  final List data = body['results'];
  return data.map((e) => BusRouteDirection.fromStarJson(e)).toList();
}

Future<List<BusLine>> fetchAllLineBus() async {
  final body = await getJson(
    Uri.parse(
        '$_base/tco-bus-topologie-lignes-td/records?select=id%2Cnomcourt%2Ccouleurligne&order_by=id&limit=50'),
    cacheFor: topologyCacheDuration,
    errorMessage: 'Failed to load lines',
  );
  final List data = body['results'];
  return data.map((e) => BusLine.fromStarJson(e)).toList();
}
