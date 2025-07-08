import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/form/save_metro_station.dart';
import 'package:transit_track_er/src/metro_feature/metro_station_short.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

Future<void> showRemoveFavoriteStationDialog(BuildContext context,
    Box<FavoriteStation> box, MetroStation station) async {
  // Step 1: Ask the user if they want to continue
  final bool? continueAction = await showDialog<bool>(
    context: context,
    builder: (BuildContext context) {
      return AlertDialog(
        title: const Text('Set Alarm'),
        content: const Text('Do you want to set a custom alarm date and time?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Continue'),
          ),
        ],
      );
    },
  );

  if (continueAction != true) return; // user canceled

  showAddFavoriteStationDialog(context, box, station);
}
