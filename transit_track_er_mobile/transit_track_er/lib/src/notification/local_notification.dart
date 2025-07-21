import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:transit_track_er/src/app.dart';
import 'package:transit_track_er/src/metro_feature/api_call.dart';
import 'package:transit_track_er/src/metro_feature/station.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> initializeNotifications() async {
  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  const InitializationSettings initializationSettings = InitializationSettings(
    android: initializationSettingsAndroid,
  );

  await flutterLocalNotificationsPlugin.initialize(
    initializationSettings,
    onDidReceiveNotificationResponse: onNotificationTap,
  );
}

void onNotificationTap(NotificationResponse response) async {
  // This is called when the user taps the notification
  print('Notification tapped: ${response.payload}');

  // Call your metro API here
  final apiCall = await fetchTestMetro('1001-0-5008');
  final data = json.decode(apiCall.body);
  final metroPassages = Station.fromJson(data['results'][0]);
  print('Next metro passage: ${metroPassages.arriveeFirstTrain}');
  // Ensure you have a context — pass it from where you set up the callback
  showDialog(
    context: navigatorKey.currentContext!,
    builder: (_) => AlertDialog(
      title: Text('Next Metro'),
      content: Text('Next passage at ${metroPassages.nomArret}: ${metroPassages.arriveeFirstTrain}'),
      actions: [
        TextButton(
          child: Text('OK'),
          onPressed: () => Navigator.of(navigatorKey.currentContext!).pop(),
        ),
      ],
    ),
  );

  // Navigate or show a dialog/snackbar with results
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

Future<void> scheduleBusStopNotification(FavoriteBusStop busStop) async {
  const androidPlatformChannelSpecifics = AndroidNotificationDetails(
    'stop_channel_id',
    'Bus Stop Notifications',
    channelDescription: 'Notifications for favorite bus stop alarms',
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
    10, // Use busStop.id for unique notification ID
    'Alarm: ${busStop.nomCourtLigne}', // Title
    'Your bus stop alarm is set for ${busStop.alarmTime}', // Body
    tz.TZDateTime.from(busStop.alarmTime, tz.local),
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
