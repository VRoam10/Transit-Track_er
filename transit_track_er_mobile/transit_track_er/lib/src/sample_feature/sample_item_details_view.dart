import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/form/remove_metro_station.dart';
import 'package:transit_track_er/src/form/save_metro_station.dart';
import 'package:transit_track_er/src/sample_feature/metro_station.dart';
import 'package:transit_track_er/src/sample_feature/test.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart'; // Ensure fetchMetro is imported

/// Displays detailed information about a SampleItem.
class SampleItemDetailsView extends StatelessWidget {
  const SampleItemDetailsView({super.key, required this.station});

  static const routeName = '/sample_item';

  final MetroStation station;

  @override
  Widget build(BuildContext context) {
    final stationBox = Hive.box<FavoriteStation>('stationsBox');
    return Scaffold(
      appBar: AppBar(
        title: Text('Details for Station #${station.id}'),
        actions: [
          ValueListenableBuilder(
            valueListenable: stationBox.listenable(),
            builder: (context, Box box, _) {
              final isFavorite = box.values.any((s) => s.id == station.id);
              return IconButton(
                icon: Icon(
                  isFavorite ? Icons.alarm_off : Icons.alarm_on,
                ),
                onPressed: () {
                  if (isFavorite) {
                    showRemoveFavoriteStationDialog(context, stationBox, station);
                    box.delete(stationBox.keys.firstWhere(
                        (k) => stationBox.get(k)!.id == station.id));
                  } else {
                    showAddFavoriteStationDialog(context, stationBox, station);
                  }
                },
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<http.Response>(
        future: fetchTestMetro(station.id),
        builder: (context, snapshot) {
          // Check if the connection is still loading
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          // If an error occurs
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          // If data is received successfully, display it
          if (snapshot.hasData) {
            final response = snapshot.data!;
            if (response.statusCode == 200) {
              // Successfully fetched data, display it
              final station =
                  Station.fromJson(json.decode(response.body)['results'][0]);
              return Center(child: MetroDetailsView(metro: station));
            } else {
              return Center(
                  child: Text(
                      'Failed to load station data. Status code: ${response.statusCode}'));
            }
          }

          // If no data is received (this shouldn't normally happen)
          return const Center(child: Text('No data found.'));
        },
      ),
    );
  }
}
