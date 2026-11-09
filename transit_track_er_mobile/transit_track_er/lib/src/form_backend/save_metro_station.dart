import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/timetable.dart';

Future<void> showAddFavoriteStationDialog(
    BuildContext context, MetroStation station) async {
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

  Timetable timetable = Timetable(
      id: '',
      enabled: true,
      idLine: station.id,
      cron: '${pickedTime.minute} ${pickedTime.hour} * * ${pickedDate.weekday}',
      mode: 'metro',
      api: 'data.explore.star.fr');

  String token = await AuthService().getToken() ?? '';
  if (token.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context)!.notAuthenticated)),
    );
    return;
  }
  try {
    await TimetableService().createTimetable(token, timetable);
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$e'.replaceFirst('Exception: ', ''))),
    );
    return;
  }

  if (!context.mounted) return;
  showAlarmSetSnackBar(context, station.name, chosenDateTime);
}
