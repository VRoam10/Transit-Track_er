import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:transit_track_er/src/types/bus_direction.dart';
import 'package:transit_track_er/src/types/bus_line.dart' show BusLine;
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';
import 'package:transit_track_er/src/types/timetable.dart';

void main() {
  group('hexToColor', () {
    test('parses #RRGGBB as an opaque color', () {
      expect(hexToColor('#E3051B'), const Color(0xFFE3051B));
    });
    test('accepts a value without #', () {
      expect(hexToColor('00893E'), const Color(0xFF00893E));
    });
    test('keeps an explicit alpha channel', () {
      expect(hexToColor('#80112233'), const Color(0x80112233));
    });
  });

  group('lines', () {
    test('MetroLine from STAR open data', () {
      final line = MetroLine.fromStarJson(
          {'id': 'a', 'nomcourt': 'a', 'couleurligne': '#E3051B'});
      expect(line.id, 'a');
      expect(line.shortName, 'a');
      expect(line.lineColor, const Color(0xFFE3051B));
    });
    test('MetroLine from the backend', () {
      final line = MetroLine.fromBackendJson(
          {'id': 'b', 'name': 'b', 'color': '#00893E'});
      expect(line.shortName, 'b');
      expect(line.lineColor, const Color(0xFF00893E));
    });
    test('BusLine from STAR and backend', () {
      expect(
          BusLine.fromStarJson(
                  {'id': '0001', 'nomcourt': 'C1', 'couleurligne': '#E2001A'})
              .shortName,
          'C1');
      expect(
          BusLine.fromBackendJson(
              {'id': '0002', 'name': 'C2', 'color': '#009EE0'}).lineColor,
          const Color(0xFF009EE0));
    });
  });

  group('stops and directions', () {
    test('MetroStation from STAR and backend', () {
      final star = MetroStation.fromStarJson(
          {'idjdd': 'A5', 'nomarret': 'République', 'sens': 0});
      expect([star.id, star.name, star.sens], ['A5', 'République', 0]);
      final backend = MetroStation.fromBackendJson(
          {'id': 'B5', 'name': 'Gares', 'direction': 1});
      expect([backend.id, backend.name, backend.sens], ['B5', 'Gares', 1]);
    });
    test('BusServicePoint from STAR', () {
      final stop = BusServicePoint.fromStarJson({
        'idligne': '0001',
        'nomcourtligne': 'C1',
        'idarret': '1234',
        'sens': 1,
        'nomarret': 'Gast',
      });
      expect(stop.id, '1234');
      expect(stop.idLigne, '0001');
      expect(stop.nomCourtLigne, 'C1');
      expect(stop.sens, 1);
    });
    test('directions from STAR and backend', () {
      expect(
          MetroDirection.fromStarJson(
              {'sens': 1, 'nomarretarrivee': 'J.F. Kennedy'}).nomarretarrivee,
          'J.F. Kennedy');
      final backend =
          BusRouteDirection.fromBackendJson({'id': 0, 'name': 'Chantepie'});
      expect([backend.sens, backend.nomarretarrivee], [0, 'Chantepie']);
    });
  });

  group('Station (metro passage)', () {
    final star = {
      'idjdd': 'A5',
      'idligne': 'a',
      'sens': 0,
      'destination': 'La Poterie',
      'idarret': '1002',
      'nomarret': 'République',
      'coordonnees': {'lon': -1.67, 'lat': 48.11},
      'arriveefirsttrain': '2026-11-09T09:44:00+00:00',
      'heureextraction': '2026-11-09T09:40:00+00:00',
    };

    test('parses STAR data', () {
      final s = Station.fromStarJson(star);
      expect(s.nomArret, 'République');
      expect(s.destination, 'La Poterie');
      expect(s.coordonnees.lat, 48.11);
      expect(s.arriveeFirstTrain, DateTime.utc(2026, 11, 9, 9, 44));
      expect(s.arriveeSecondTrain, isNull);
    });

    test('reads the second train when present', () {
      final s = Station.fromStarJson(
          {...star, 'arriveesecondtrain': '2026-11-09T09:49:00+00:00'});
      expect(s.arriveeSecondTrain, DateTime.utc(2026, 11, 9, 9, 49));
    });

    test('ignores an invalid second train time', () {
      final s =
          Station.fromStarJson({...star, 'arriveesecondtrain': 'not a date'});
      expect(s.arriveeSecondTrain, isNull);
    });

    test('rejects STAR data with a missing field', () {
      final bad = Map<String, dynamic>.from(star)..remove('nomarret');
      expect(() => Station.fromStarJson(bad), throwsFormatException);
    });

    test('parses backend data', () {
      final s = Station.fromBackendJson({
        'id': 'B5',
        'lineId': 'a',
        'direction': 0,
        'name': 'République',
        'coordonnees': {'lon': -1.67, 'lat': 48.11},
        'nextTrain': '2026-11-09T09:44:00Z',
        'extraction': '2026-11-09T09:40:00Z',
      });
      expect(s.idjdd, 'B5');
      expect(s.destination, isNull);
      expect(s.arriveeFirstTrain, DateTime.utc(2026, 11, 9, 9, 44));
    });
  });

  group('BusStop (bus passage)', () {
    test('parses STAR data', () {
      final b = BusStop.fromStarJson({
        'idligne': '0001',
        'sens': 0,
        'destination': 'Chantepie',
        'idarret': '1234',
        'nomarret': 'République',
        'coordonnees': {'lon': -1.67, 'lat': 48.11},
        'arrivee': '2026-11-09T10:00:00+00:00',
        'heureextraction': '2026-11-09T09:55:00+00:00',
      });
      expect(b.destination, 'Chantepie');
      expect(b.arriveeBus, DateTime.utc(2026, 11, 9, 10));
    });

    test('parses backend data', () {
      final b = BusStop.fromBackendJson({
        'id': '0001-0-1234',
        'lineId': '0001',
        'direction': 0,
        'name': 'République',
        'coordonnees': {'lon': -1.67, 'lat': 48.11},
        'nextTrain': '2026-11-09T10:00:00Z',
        'extraction': '2026-11-09T09:55:00Z',
      });
      expect(b.id, '0001-0-1234');
      expect(b.nomArret, 'République');
    });

    test('rejects malformed data', () {
      expect(() => BusStop.fromBackendJson({'id': 1}), throwsFormatException);
    });
  });

  test('Timetable from the backend', () {
    final t = Timetable.fromBackendJson({
      'id': 't1',
      'enabled': false,
      'timetable': {
        'id': 'B5',
        'cron': '15 8 * * 1',
        'mode': 'metro',
        'api': 'data.explore.star.fr',
      },
      'createdAt': '2026-11-01T08:00:00Z',
    });
    expect(t.id, 't1');
    expect(t.enabled, isFalse);
    expect(t.idLine, 'B5');
    expect(t.cron, '15 8 * * 1');
    expect(t.mode, 'metro');
    expect(t.createdAt, DateTime.utc(2026, 11, 1, 8));
  });

  test('Connector from JSON', () {
    final c = Connector.fromJson(
        {'id': 'c1', 'name': 'TCL Lyon', 'apiUrl': 'https://api.tcl.example'});
    expect([c.id, c.name, c.apiUrl],
        ['c1', 'TCL Lyon', 'https://api.tcl.example']);
  });
}
