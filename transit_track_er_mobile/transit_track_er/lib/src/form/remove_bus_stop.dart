import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/form/save_bus_stop.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

Future<void> showRemoveFavoriteBusStopDialog(BuildContext context,
    Box<FavoriteBusStop> box, BusServicePoint station) async {
  // Step 1: Ask the user if they want to continue
  final bool continueAction = await showAlarmConfirmDialog(context);

  if (!continueAction) return; // user canceled

  showAddFavoriteBusStopDialog(context, box, station);
}
