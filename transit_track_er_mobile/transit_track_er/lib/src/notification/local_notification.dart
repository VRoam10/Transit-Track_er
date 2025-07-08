import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> initializeNotifications() async {
  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  const InitializationSettings initializationSettings = InitializationSettings(
    android: initializationSettingsAndroid,
  );

  await flutterLocalNotificationsPlugin.initialize(initializationSettings);
}

Future<void> scheduleStationNotification(FavoriteStation station) async {
  const androidPlatformChannelSpecifics = AndroidNotificationDetails(
    'station_channel_id',
    'Station Notifications',
    channelDescription: 'Notifications for favorite station alarms',
    importance: Importance.max,
    priority: Priority.high,
  );

  const platformChannelSpecifics = NotificationDetails(
    android: androidPlatformChannelSpecifics,
  );

  final androidImplementation =
      flutterLocalNotificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  final bool? isExactAllowed =
      await androidImplementation?.areNotificationsEnabled();

  await flutterLocalNotificationsPlugin.zonedSchedule(
    9, // Use station.id for unique notification ID
    'Alarm: ${station.nomCourtLigne}', // Title
    'Your station alarm is set for ${station.alarmTime}', // Body
    tz.TZDateTime.from(station.alarmTime, tz.local),
    platformChannelSpecifics,
    uiLocalNotificationDateInterpretation:
        UILocalNotificationDateInterpretation.absoluteTime,
    matchDateTimeComponents:
        DateTimeComponents.time, // For repeating at the same time
    androidScheduleMode: isExactAllowed == true
        ? AndroidScheduleMode.inexact //exactAllowWhileIdle
        : AndroidScheduleMode.inexact, // fallback if no exact alarms permission
  );
}
