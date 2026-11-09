import 'package:flutter/material.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/notification/local_notification.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

Future<void> showAddFavoriteStationDialog(BuildContext context,
    Box<FavoriteStation> box, MetroStation station) async {
  // Step 1: Let the user choose a date
  final DateTime? pickedDate = await showDatePicker(
    context: context,
    initialDate: DateTime.now(),
    firstDate: DateTime.now(),
    lastDate: DateTime(2100),
  );

  if (pickedDate == null) return; // user cancelled

  // Step 2: Let the user choose a time
  final TimeOfDay? pickedTime = await showTime24Picker(context);

  if (pickedTime == null) return; // user cancelled

  // Step 3: Combine the date and time
  final DateTime chosenDateTime = DateTime(
    pickedDate.year,
    pickedDate.month,
    pickedDate.day,
    pickedTime.hour,
    pickedTime.minute,
  );

  FavoriteStation favoriteStation = FavoriteStation(
      idjdd: station.id,
      nomCourtLigne: station.name,
      sens: station.sens,
      alarmTime: chosenDateTime);

  box.add(favoriteStation);

  await scheduleStationNotification(favoriteStation);

  if (!context.mounted) return;
  showAlarmSetSnackBar(context, station.name, chosenDateTime);
}
