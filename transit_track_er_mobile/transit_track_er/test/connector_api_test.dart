import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';

const _token = 't';
http.Response _json(Object body) =>
    http.Response(json.encode(body), 200, headers: {'content-type': 'application/json'});

void main() {
  setUp(clearConnectorMetaCache);

  group('fetchConnectorNxpassage (F1 array envelope)', () {
    final station = {
      'id': 's1', 'lineId': 'M1', 'direction': 0, 'name': 'Stop',
      'coordonnees': {'lat': 1.0, 'lon': 2.0},
      'nextTrain': '2026-01-01T00:00:00.000Z', 'extraction': '2026-01-01T00:00:00.000Z',
    };

    test('parses the first element of the data array', () async {
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) {
          return _json({'data': [station], 'pagination': {'next': null}});
        }
        return _json({'params': ['stopId'], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      final s = await fetchConnectorNxpassage('c1', 's1', _token, client: client);
      expect(s.idjdd, 's1');
      expect(s.nomArret, 'Stop');
    });

    test('throws when the data array is empty', () async {
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': []});
        return _json({'params': ['stopId'], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      expect(() => fetchConnectorNxpassage('c1', 's1', _token, client: client),
          throwsA(isA<Exception>()));
    });
  });

  group('fetchConnectorLines pagination', () {
    final line = {'id': 'M1', 'name': 'Metro 1', 'color': '#ff0000'};

    test('offset style surfaces the engine pagination.next', () async {
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': [line], 'pagination': {'next': 50}});
        return _json({'params': [], 'definition': {'request': {'pagination': {'style': 'offset'}}}});
      });
      final r = await fetchConnectorLines('c1', _token, client: client);
      expect(r.items.length, 1);
      expect(r.items.first.shortName, 'Metro 1');
      expect(r.next, 50);
    });

    test('none style synthesizes next = position + count, null on empty', () async {
      var empty = false;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': empty ? [] : [line]});
        return _json({'params': [], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      final r1 = await fetchConnectorLines('c1', _token, client: client);
      expect(r1.next, 1);
      empty = true;
      final r2 = await fetchConnectorLines('c1', _token, position: 1, client: client);
      expect(r2.next, null);
    });
  });

  group('fetchConnectorStops param mapping', () {
    final stop = {'id': 's1', 'name': 'Stop 1', 'direction': 0};
    test('maps line/direction params + offset from cached meta', () async {
      Uri? proxyUri;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) {
          proxyUri = req.url;
          return _json({'data': [stop], 'pagination': {'next': null}});
        }
        return _json({'params': ['lineParam', 'dirParam'], 'definition': {'request': {'pagination': {'style': 'offset'}}}});
      });
      final r = await fetchConnectorStops('c1', 'L1', 'D1', _token, client: client);
      expect(r.items.length, 1);
      expect(proxyUri!.queryParameters['lineParam'], 'L1');
      expect(proxyUri!.queryParameters['dirParam'], 'D1');
      expect(proxyUri!.queryParameters['offset'], '0');
    });
  });

  group('metadata cache', () {
    final line = {'id': 'M1', 'name': 'Metro 1', 'color': '#fff'};
    test('fetches the GET /:kind config only once across calls', () async {
      var metaHits = 0;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) return _json({'data': [line]});
        metaHits++;
        return _json({'params': [], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      await fetchConnectorLines('c1', _token, client: client);
      await fetchConnectorLines('c1', _token, position: 1, client: client);
      expect(metaHits, 1);
    });
  });

  group('fetchConnectorDirections', () {
    final dir = {'id': 0, 'name': 'North'};
    test('parses the data array with the mapped param', () async {
      Uri? proxyUri;
      final client = MockClient((req) async {
        if (req.url.path.endsWith('/proxy')) {
          proxyUri = req.url;
          return _json({'data': [dir]});
        }
        return _json({'params': ['lineParam'], 'definition': {'request': {'pagination': {'style': 'none'}}}});
      });
      final list = await fetchConnectorDirections('c1', 'L1', _token, client: client);
      expect(list.length, 1);
      expect(list.first.nomarretarrivee, 'North');
      expect(proxyUri!.queryParameters['lineParam'], 'L1');
    });
  });
}
