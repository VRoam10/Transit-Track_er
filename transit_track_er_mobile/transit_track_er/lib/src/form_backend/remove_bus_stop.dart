import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';
import 'package:transit_track_er/src/form_backend/save_bus_stop.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/timetable.dart';

Future<void> showRemoveFavoriteBusStopDialog(
    BuildContext context, BusServicePoint bus, Timetable timetable) async {
  // Step 1: Ask the user if they want to continue
  final bool continueAction = await showAlarmConfirmDialog(context);

  String token = await AuthService().getToken() ?? '';
  if (token.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context)!.notAuthenticated)),
    );
    return;
  }
  await TimetableService().deleteTimetable(token, timetable);

  if (!continueAction) return; // user canceled

  showAddFavoriteBusStopDialog(context, bus);
}
