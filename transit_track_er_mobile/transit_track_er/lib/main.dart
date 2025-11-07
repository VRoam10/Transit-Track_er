import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:transit_track_er/src/notification/local_notification.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/notification_service.dart';
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

  await Firebase.initializeApp();

  // Initialize notifications
  final notificationService = NotificationService();
  await notificationService.initialize();

  // Remove old auth token if expired
  final authToken = await AuthService().getToken();

  if (authToken != null && JwtDecoder.isExpired(authToken)) {
    await AuthService().logout();
  }

  // Run the app and pass in the SettingsController. The app listens to the
  // SettingsController for changes, then passes it further down to the
  // SettingsView.
  runApp(MyApp(settingsController: settingsController));
}
