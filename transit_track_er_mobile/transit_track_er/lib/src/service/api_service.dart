import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/service/auth_service.dart';

Future<void> initFirebaseAndRegisterToken() async {
  // Initialize Firebase (only once)
  await Firebase.initializeApp();

  // Get FCM token
  FirebaseMessaging messaging = FirebaseMessaging.instance;
  String? fcmToken = await messaging.getToken();
  print("FCM Token: $fcmToken");

  // Read your stored auth token
  final authToken = await AuthService().getToken();

  if (authToken == null) {
    print("User not logged in. Skipping FCM registration.");
    return;
  }

  // Register FCM token with your backend
  try {
    final url = Uri.parse('${Environment.baseUrl}/api/users/register-token');
    await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      },
      body: jsonEncode({'token': fcmToken ?? ''}),
    );
    print("FCM token registered successfully.");
  } catch (e) {
    print("Error registering FCM token: $e");
  }
}
