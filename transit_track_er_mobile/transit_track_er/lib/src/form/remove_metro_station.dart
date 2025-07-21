import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/form/save_metro_station.dart';
import 'package:transit_track_er/src/metro_feature/metro_station.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

Future<void> showRemoveFavoriteStationDialog(BuildContext context,
    Box<FavoriteStation> box, MetroStation station) async {
  // Step 1: Ask the user if they want to continue
  final bool? continueAction = await showDialog<bool>(
    context: context,
    builder: (BuildContext context) {
      final localizations = AppLocalizations.of(context)!;
      return AlertDialog(
        title: Text(localizations.setAlarm),
        content: Text(localizations.setAlarmConfirmation),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(localizations.cancelAction),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(localizations.continueAction),
          ),
        ],
      );
    },
  );

  if (continueAction != true) return; // user canceled

  showAddFavoriteStationDialog(context, box, station);
}
