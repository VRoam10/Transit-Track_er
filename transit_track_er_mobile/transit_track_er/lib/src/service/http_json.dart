import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// One shared HTTP client for every API call: keeps connections alive
/// (no new TCP/TLS handshake per request) instead of `http.get` which opens
/// a fresh client each time.
http.Client _client = http.Client();

/// Replaces the shared client and empties the cache (tests only).
@visibleForTesting
void debugSetHttpClient(http.Client client) {
  _client = client;
  _cache.clear();
}

class _CacheEntry {
  _CacheEntry(this.future, this.expiresAt);
  final Future<dynamic> future;
  final DateTime expiresAt;
}

final Map<String, _CacheEntry> _cache = {};

/// How long rarely-changing network topology (lines, directions, stop lists)
/// stays cached in memory.
const Duration topologyCacheDuration = Duration(hours: 1);

/// GETs [uri] and returns the decoded JSON body.
///
/// When [cacheFor] is set, the result is kept in memory for that duration and
/// concurrent calls for the same URL share a single in-flight request.
/// Live data (next passages) should be fetched without [cacheFor].
Future<dynamic> getJson(
  Uri uri, {
  Duration? cacheFor,
  Duration timeout = const Duration(seconds: 10),
  String errorMessage = 'Request failed',
}) {
  final key = uri.toString();
  if (cacheFor != null) {
    final cached = _cache[key];
    if (cached != null && cached.expiresAt.isAfter(DateTime.now())) {
      return cached.future;
    }
  }

  final future = _client.get(uri).timeout(timeout).then((response) {
    if (response.statusCode != 200) {
      throw Exception('$errorMessage (${response.statusCode})');
    }
    return json.decode(utf8.decode(response.bodyBytes));
  });

  if (cacheFor != null) {
    _cache[key] = _CacheEntry(future, DateTime.now().add(cacheFor));
    // Never keep a failed request in the cache.
    future.catchError((Object _) {
      _cache.remove(key);
      return null;
    });
  }
  return future;
}
