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

  // Set up the SettingsController, which will glue user settings to multiple
  // Flutter Widgets.
  final settingsController = SettingsController(SettingsService());

  Hive.registerAdapter(FavoriteStationAdapter());
  Hive.registerAdapter(FavoriteBusStopAdapter());
  configureLocalTimeZone();

  // Independent start-up work runs in parallel instead of one after the
  // other, so the splash screen is shown for less time.
  await Future.wait<void>([
    // Load the user's preferred theme while the splash screen is displayed.
    // This prevents a sudden theme change when the app is first displayed.
    settingsController.loadSettings(),
    Hive.initFlutter().then((_) => Future.wait([
          Hive.openBox<FavoriteStation>('stationsBox'),
          Hive.openBox<FavoriteBusStop>('busBox'),
        ])),
    // Kept in this order: the local-notification plugin is a singleton and
    // NotificationService re-initializes it.
    initializeNotifications().then((_) => Firebase.initializeApp()),
    _dropExpiredToken(),
  ]);

  // Run the app and pass in the SettingsController. The app listens to the
  // SettingsController for changes, then passes it further down to the
  // SettingsView.
  runApp(MyApp(settingsController: settingsController));

  // Push setup and the notification permission prompt do not need to block
  // the first frame.
  NotificationService().initialize().catchError((Object _) {});
  Permission.notification.isDenied.then((denied) {
    if (denied) Permission.notification.request();
  });
}

/// Removes the stored auth token if it has expired.
Future<void> _dropExpiredToken() async {
  final authToken = await AuthService().getToken();
  if (authToken != null && JwtDecoder.isExpired(authToken)) {
    await AuthService().logout();
  }
}
