import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/widgets/app_snackbar.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/timetable.dart';

Future<void> showAddFavoriteBusStopDialog(
    BuildContext context, BusServicePoint busStop) async {
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
      idLine: busStop.id,
      cron: '${pickedTime.minute} ${pickedTime.hour} * * ${pickedDate.weekday}',
      mode: 'bus',
      api: 'data.explore.star.fr');

  String token = await AuthService().getToken() ?? '';
  if (token.isEmpty) {
    AppSnackbar.showError(
      context,
      AppLocalizations.of(context)!.notAuthenticated,
    );
    return;
  }
  try {
    await TimetableService().createTimetable(token, timetable);
  } catch (e) {
    if (!context.mounted) return;
    AppSnackbar.showError(context, '$e'.replaceFirst('Exception: ', ''));
    return;
  }

  if (!context.mounted) return;
  showAlarmSetSnackBar(context, busStop.name, chosenDateTime);
}
