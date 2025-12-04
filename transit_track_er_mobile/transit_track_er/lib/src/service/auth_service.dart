import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';

class AuthService {
  Future<bool> loginIsValid(String email, String password) async {
    try {
      final response = await http
          .post(
        Uri.parse('${Environment.baseUrl}/api/users/login'),
        headers: <String, String>{
          'Content-Type': 'application/json',
        },
        body: jsonEncode(<String, String>{
          'email': email,
          'password': password,
        }),
      )
          .timeout(
        const Duration(seconds: 2),
        onTimeout: () {
          throw TimeoutException('Request timed out after 2 seconds');
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = jsonDecode(response.body);
        await saveToken(responseData["token"]);
        return true;
      } else {
        return false;
      }
    } on TimeoutException catch (_) {
      throw Exception(
          'Connection timeout: Please check your internet connection');
    } catch (e) {
      return false;
    }
  }

  Future<void> saveToken(String token) async {
    const storage = FlutterSecureStorage();
    await storage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    const storage = FlutterSecureStorage();
    return await storage.read(key: 'auth_token');
  }

  Future<void> logout() async {
    const storage = FlutterSecureStorage();
    await storage.delete(key: 'auth_token');
  }

  Future<void> register(String name, String email, String password) async {
    try {
      final response = await http
          .post(
        Uri.parse('${Environment.baseUrl}/api/users/'),
        headers: <String, String>{
          'Content-Type': 'application/json',
        },
        body: jsonEncode(<String, String>{
          'email': email,
          'name': name,
          'password': password,
        }),
      )
          .timeout(
        const Duration(seconds: 2),
        onTimeout: () {
          throw TimeoutException('Request timed out after 2 seconds');
        },
      );

      if (response.statusCode != 201) {
        throw Exception('Failed to register user: ${response.statusCode}');
      }
      return;
    } on TimeoutException catch (_) {
      throw Exception(
          'Connection timeout: Please check your internet connection');
    } catch (e) {
      throw Exception('Registration failed: $e');
    }
  }
}
