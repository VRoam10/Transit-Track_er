import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:transit_track_er/src/bus_feature/api_call.dart' as bus;
import 'package:transit_track_er/src/metro_feature/api_call.dart' as metro;
import 'package:transit_track_er/src/service/http_json.dart';

// STAR serves UTF-8 JSON (accents in stop names).
http.Response results(List<Map<String, dynamic>> items) =>
    http.Response.bytes(utf8.encode(jsonEncode({'results': items})), 200,
        headers: {'content-type': 'application/json; charset=utf-8'});

void main() {
  final requested = <Uri>[];

  void respond(http.Response Function(Uri uri) handler) {
    requested.clear();
    debugSetHttpClient(MockClient((request) async {
      requested.add(request.url);
      return handler(request.url);
    }));
  }

  test('fetchAllLineMetro maps STAR lines', () async {
    respond((_) => results([
          {'id': 'a', 'nomcourt': 'a', 'couleurligne': '#E3051B'},
          {'id': 'b', 'nomcourt': 'b', 'couleurligne': '#00893E'},
        ]));

    final lines = await metro.fetchAllLineMetro();

    expect(lines.map((l) => l.shortName), ['a', 'b']);
    expect(requested.single.path, contains('tco-metro-topologie-lignes-td'));
  });

  test('metro lines are cached between screens', () async {
    respond((_) => results([
          {'id': 'a', 'nomcourt': 'a', 'couleurligne': '#E3051B'},
        ]));

    await metro.fetchAllLineMetro();
    await metro.fetchAllLineMetro();

    expect(requested, hasLength(1));
  });

  test('next passages are never cached', () async {
    respond((_) => results([
          {
            'idjdd': 'A5',
            'idligne': 'a',
            'sens': 0,
            'destination': 'La Poterie',
            'idarret': '1002',
            'nomarret': 'République',
            'coordonnees': {'lon': -1.67, 'lat': 48.11},
            'arriveefirsttrain': '2026-11-09T09:44:00+00:00',
            'heureextraction': '2026-11-09T09:40:00+00:00',
          }
        ]));

    await metro.fetchTestMetro('A5');
    final second = await metro.fetchTestMetro('A5');

    expect(requested, hasLength(2));
    expect(second.single.nomArret, 'République');
    expect(requested.first.queryParameters['refine'], 'idjdd:A5');
  });

  test('fetchAllMetro filters by line', () async {
    respond((_) => results([
          {'idjdd': 'A0', 'nomarret': 'J.F. Kennedy', 'sens': 0},
        ]));

    final stations = await metro.fetchAllMetro('a');

    expect(stations.single.name, 'J.F. Kennedy');
    expect(requested.single.queryParameters['refine'], 'idligne:"a"');
  });

  test('fetchAllBusLigne and fetchLineDirection parse bus data', () async {
    respond((uri) => uri.path.contains('parcours')
        ? results([
            {'sens': 0, 'nomarretarrivee': 'Chantepie'},
          ])
        : results([
            {
              'idligne': '0001',
              'nomcourtligne': 'C1',
              'idarret': '1',
              'sens': 0,
              'nomarret': 'Gast',
            },
          ]));

    final stops = await bus.fetchAllBusLigne('0001');
    final directions = await bus.fetchLineDirection('0001');

    expect(stops.single.name, 'Gast');
    expect(directions.single.nomarretarrivee, 'Chantepie');
  });

  test('surfaces a readable error when STAR is down', () async {
    respond((_) => http.Response('error', 500));

    expect(
      bus.fetchAllLineBus(),
      throwsA(predicate((e) => '$e'.contains('Failed to load lines'))),
    );
  });
}
