import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:transit_track_er/src/app.dart';
import 'package:transit_track_er/src/bus_feature/api_call.dart';
import 'package:transit_track_er/src/metro_feature/api_call.dart';
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
  final Map<String, dynamic> payload = json.decode(response.payload ?? '{}');

  if (payload['metro'] == true) {
    // Handle metro station notification
    await handleMetroNotification(payload);
  } else {
    // Handle bus stop notification
    await handleBusStopNotification(payload);
  }
}

handleMetroNotification(Map<String, dynamic> payload) async {
  // Call your metro API here
  final data = await fetchTestMetro(payload['stationId'] ?? '');
  final metroPassages = data.first;

  // Ensure you have a context — pass it from where you set up the callback
  showDialog(
    context: navigatorKey.currentContext!,
    builder: (BuildContext context) {
      final localizations = AppLocalizations.of(context)!;

      return AlertDialog(
        title: Text(localizations.nextMetroPassage),
        content: Text(
          '${localizations.nextPassageAt} ${metroPassages.nomArret}: ${metroPassages.arriveeFirstTrain}',
        ),
        actions: [
          TextButton(
            child: const Text("OK"),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      );
    },
  );
}

handleBusStopNotification(Map<String, dynamic> payload) async {
  // Call your bus API here
  final data =
      await fetchTestBus(payload['idArret'] ?? '', payload['idLigne'] ?? '');
  final busPassages = data.first;

  // Ensure you have a context — pass it from where you set up the callback
  showDialog(
    context: navigatorKey.currentContext!,
    builder: (BuildContext context) {
      final localizations = AppLocalizations.of(context)!;

      return AlertDialog(
        title: Text(localizations.nextBusPassage),
        content: Text(
          '${localizations.nextPassageAt} ${busPassages.nomArret}: ${busPassages.arriveeBus}',
        ),
        actions: [
          TextButton(
            child: const Text("OK"),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      );
    },
  );
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
    station.idjdd.hashCode,
    'Alarm: ${station.nomCourtLigne}', // Title
    'Your station alarm is set for ${station.alarmTime}', // Body
    tz.TZDateTime.from(station.alarmTime, tz.local),
    platformChannelSpecifics,
    payload: json.encode({
      'stationId': station.idjdd,
      'metro': true, // Indicate this is a metro station notification
    }),
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
    busStop.idArret.hashCode,
    'Alarm: ${busStop.nomCourtLigne}', // Title
    'Your bus stop alarm is set for ${busStop.alarmTime}', // Body
    tz.TZDateTime.from(busStop.alarmTime, tz.local),
    platformChannelSpecifics,
    payload: json.encode({
      'idArret': busStop.idArret,
      'idLigne': busStop.idLigne,
      'metro': false, // Indicate this is a bus stop notification
    }),
    uiLocalNotificationDateInterpretation:
        UILocalNotificationDateInterpretation.absoluteTime,
    matchDateTimeComponents:
        DateTimeComponents.time, // For repeating at the same time
    androidScheduleMode: isExactAllowed == true
        ? AndroidScheduleMode.inexact //exactAllowWhileIdle
        : AndroidScheduleMode.inexact, // fallback if no exact alarms permission
  );
}
