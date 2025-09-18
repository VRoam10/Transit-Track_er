import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:transit_track_er/src/environment.dart';
import 'package:transit_track_er/src/notification/local_notification.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';
import 'package:transit_track_er/src/settings/timezone.dart';

import 'src/app.dart';
import 'src/settings/settings_controller.dart';
import 'src/settings/settings_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Permission.notification.isDenied.then((value) {
    if (value) {
      Permission.notification.request();
    }
  });

  // Initialize Firebase
  await Firebase.initializeApp();

  FirebaseMessaging messaging = FirebaseMessaging.instance;

  String? token = await messaging.getToken();
  print("FCM Token: $token");

  try {
    final url = Uri.parse('${Environment.baseUrl}/api/users/register-token');
    await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(<String, String>{'token': token ?? ''}),
    );
  } catch (e) {
    print("Error registering FCM token: $e");
  }

  // Set up the SettingsController, which will glue user settings to multiple
  // Flutter Widgets.
  final settingsController = SettingsController(SettingsService());

  // Load the user's preferred theme while the splash screen is displayed.
  // This prevents a sudden theme change when the app is first displayed.
  await settingsController.loadSettings();

  // Initialize Hive and open a box
  await Hive.initFlutter();
  Hive.registerAdapter(FavoriteStationAdapter());
  Hive.registerAdapter(FavoriteBusStopAdapter());

  await Hive.openBox<FavoriteStation>('stationsBox');
  await Hive.openBox<FavoriteBusStop>('busBox');

  configureLocalTimeZone();
  await initializeNotifications();

  // Run the app and pass in the SettingsController. The app listens to the
  // SettingsController for changes, then passes it further down to the
  // SettingsView.
  runApp(MyApp(settingsController: settingsController));
}
