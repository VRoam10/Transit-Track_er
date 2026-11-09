import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';
import 'package:transit_track_er/src/form_backend/save_metro_station.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/timetable.dart';
import 'package:transit_track_er/src/widgets/app_snackbar.dart';

Future<void> showRemoveFavoriteStationDialog(
    BuildContext context, MetroStation station, Timetable timetable) async {
  // Step 1: Ask the user if they want to continue
  final bool continueAction = await showAlarmConfirmDialog(context);

  String token = await AuthService().getToken() ?? '';
  if (token.isEmpty) {
    AppSnackbar.showError(
      context,
      AppLocalizations.of(context)!.notAuthenticated,
    );
    return;
  }
  await TimetableService().deleteTimetable(token, timetable);

  if (!continueAction) return; // user canceled

  showAddFavoriteStationDialog(context, station);
}
