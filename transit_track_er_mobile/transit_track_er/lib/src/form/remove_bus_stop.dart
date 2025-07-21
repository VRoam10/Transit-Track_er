import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/bus_feature/bus_service_point.dart';
import 'package:transit_track_er/src/form/save_bus_stop.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';

Future<void> showRemoveFavoriteBusStopDialog(BuildContext context,
    Box<FavoriteBusStop> box, BusServicePoint station) async {
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

  showAddFavoriteBusStopDialog(context, box, station);
}
