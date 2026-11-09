import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:transit_track_er/src/service/http_json.dart';

void main() {
  late int calls;

  void useClient(Future<http.Response> Function(http.Request) handler) {
    calls = 0;
    debugSetHttpClient(MockClient((request) {
      calls++;
      return handler(request);
    }));
  }

  final uri = Uri.parse('https://api.test/lines');

  test('decodes the JSON body', () async {
    useClient((_) async => http.Response('{"data":[1,2]}', 200));

    final body = await getJson(uri);

    expect(body, {
      'data': [1, 2]
    });
  });

  test('decodes UTF-8 even without a charset header', () async {
    useClient((_) async => http.Response.bytes(
        utf8.encode('{"name":"Hôtel de Ville"}'), 200,
        headers: {'content-type': 'application/json'}));

    final body = await getJson(uri);

    expect(body['name'], 'Hôtel de Ville');
  });

  test('throws with the status code on a non-200 response', () async {
    useClient((_) async => http.Response('nope', 503));

    expect(
      () => getJson(uri, errorMessage: 'Failed to load lines'),
      throwsA(predicate((e) => '$e'.contains('Failed to load lines (503)'))),
    );
  });

  test('requests without cacheFor always hit the network', () async {
    useClient((_) async => http.Response('{}', 200));

    await getJson(uri);
    await getJson(uri);

    expect(calls, 2);
  });

  test('cached requests are served from memory', () async {
    useClient((_) async => http.Response('{"v":1}', 200));

    final first = await getJson(uri, cacheFor: const Duration(minutes: 5));
    final second = await getJson(uri, cacheFor: const Duration(minutes: 5));

    expect(calls, 1);
    expect(second, first);
  });

  test('concurrent cached requests share one network call', () async {
    useClient((_) async {
      await Future<void>.delayed(const Duration(milliseconds: 10));
      return http.Response('{}', 200);
    });

    await Future.wait([
      getJson(uri, cacheFor: const Duration(minutes: 5)),
      getJson(uri, cacheFor: const Duration(minutes: 5)),
      getJson(uri, cacheFor: const Duration(minutes: 5)),
    ]);

    expect(calls, 1);
  });

  test('different URLs are cached separately', () async {
    useClient((_) async => http.Response('{}', 200));

    await getJson(uri, cacheFor: const Duration(minutes: 5));
    await getJson(Uri.parse('https://api.test/stops'),
        cacheFor: const Duration(minutes: 5));

    expect(calls, 2);
  });

  test('a failed request is not cached', () async {
    var fail = true;
    useClient((_) async =>
        fail ? http.Response('down', 500) : http.Response('{"ok":true}', 200));

    await expectLater(
        getJson(uri, cacheFor: const Duration(minutes: 5)), throwsException);
    fail = false;
    final body = await getJson(uri, cacheFor: const Duration(minutes: 5));

    expect(body, {'ok': true});
    expect(calls, 2);
  });

  test('an expired entry is fetched again', () async {
    useClient((_) async => http.Response('{}', 200));

    await getJson(uri, cacheFor: Duration.zero);
    await getJson(uri, cacheFor: Duration.zero);

    expect(calls, 2);
  });

  test('times out slow requests', () async {
    useClient((_) => Future.delayed(
        const Duration(seconds: 1), () => http.Response('{}', 200)));

    expect(
      () => getJson(uri, timeout: const Duration(milliseconds: 20)),
      throwsA(isA<Exception>()),
    );
  });
}
