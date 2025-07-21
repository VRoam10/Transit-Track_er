import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/bus_feature/bus_service_point.dart';
import 'package:transit_track_er/src/notification/local_notification.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';

Future<void> showAddFavoriteBusStopDialog(
    BuildContext context, Box<FavoriteBusStop> box, BusServicePoint busStop) async {
  // Step 1: Let the user choose a date
  final DateTime? pickedDate = await showDatePicker(
    context: context,
    initialDate: DateTime.now(),
    firstDate: DateTime.now(),
    lastDate: DateTime(2100),
  );

  if (pickedDate == null) return; // user cancelled

  // Step 2: Let the user choose a time
  final TimeOfDay? pickedTime = await showTimePicker(
    context: context,
    initialTime: TimeOfDay.now(),
  );

  if (pickedTime == null) return; // user cancelled

  // Step 3: Combine the date and time
  final DateTime chosenDateTime = DateTime(
    pickedDate.year,
    pickedDate.month,
    pickedDate.day,
    pickedTime.hour,
    pickedTime.minute,
  );

  FavoriteBusStop favoriteBusStop = FavoriteBusStop(
    idLigne: busStop.idLigne,
    nomCourtLigne: busStop.nomCourtLigne,
    idArret: busStop.idArret,
    name: busStop.name,
    sens: busStop.sens,
    alarmTime:
        DateTime.now().add(const Duration(minutes: 5)), // or custom logic
  );

  box.add(favoriteBusStop);

  await scheduleBusStopNotification(favoriteBusStop);

  // Optional: show confirmation
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
        content: Text(
            'Favorite Bus Stop ${busStop.name} added for ${chosenDateTime.toLocal()}')),
  );
}
