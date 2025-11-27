import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/types/timetable.dart';

class TimetableService {
  Future<List<Timetable>> fetchTimetable(String token) async {
    final response = await http.get(
      Uri.parse('${Environment.baseUrl}/api/timetables'),
      headers: <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(
      const Duration(seconds: 2),
      onTimeout: () {
        throw TimeoutException('Request timed out after 2 seconds');
      },
    );
    if (response.statusCode == 200) {
      final List data = json.decode(response.body);
      return data.map((e) => Timetable.fromBackendJson(e)).toList();
    } else {
      throw Exception('Failed to load timetable');
    }
  }

  Future<Timetable> createTimetable(
      String token, Timetable timetable) async {
    final response = await http
        .post(
      Uri.parse('${Environment.baseUrl}/api/timetables'),
      headers: <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(<String, Object>{
        'timetable': {
          "id": timetable.idLine,
          "api": timetable.api,
          "cron": timetable.cron,
          "mode": timetable.mode,
        },
      }),
    )
        .timeout(
      const Duration(seconds: 2),
      onTimeout: () {
        throw TimeoutException('Request timed out after 2 seconds');
      },
    );
    if (response.statusCode == 201) {
      final data = json.decode(response.body);
      return Timetable.fromBackendJson(data);
    } else {
      throw Exception('Failed to create timetable');
    }
  }

  Future<void> deleteTimetable(String token, Timetable timetable) async {
    final response = await http.delete(
      Uri.parse('${Environment.baseUrl}/api/timetables/${timetable.id}'),
      headers: <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(
      const Duration(seconds: 2),
      onTimeout: () {
        throw TimeoutException('Request timed out after 2 seconds');
      },
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to delete timetable');
    }
  }
}
