import 'package:flutter/material.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/form/save_metro_station.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

Future<void> showRemoveFavoriteStationDialog(BuildContext context,
    Box<FavoriteStation> box, MetroStation station) async {
  // Step 1: Ask the user if they want to continue
  final bool continueAction = await showAlarmConfirmDialog(context);

  if (!continueAction) return; // user canceled

  showAddFavoriteStationDialog(context, box, station);
}
