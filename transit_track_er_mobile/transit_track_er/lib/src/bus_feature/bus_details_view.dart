import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/bus_feature/api_call.dart';
import 'package:transit_track_er/src/bus_feature/bus_full.dart';
import 'package:transit_track_er/src/bus_feature/bus_short.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';

/// Displays detailed information about a Bus Stop.
class BusStopDetailsView extends StatelessWidget {
  const BusStopDetailsView({super.key, required this.bus});

  static const routeName = '/bus_stop_details';

  final BusStop bus;

  @override
  Widget build(BuildContext context) {
    final busBox = Hive.box<FavoriteBusStop>('busBox');
    return Scaffold(
      appBar: AppBar(
        title: Text('Details for Station #${bus.idLigne}'),
        actions: [
          ValueListenableBuilder(
            valueListenable: busBox.listenable(),
            builder: (context, Box box, _) {
              final isFavorite = box.values.any((s) => s.id == bus.idLigne);
              return IconButton(
                icon: Icon(
                  isFavorite ? Icons.alarm_off : Icons.alarm_on,
                ),
                onPressed: () {
                  if (isFavorite) {
                    // showRemoveFavoriteStationDialog(context, busBox, bus);
                    // box.delete(busBox.keys
                    //     .firstWhere((k) => busBox.get(k)!.idjdd == bus.id));
                  } else {
                    // showAddFavoriteStationDialog(context, busBox, bus);
                  }
                },
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<http.Response>(
        future: fetchTestBus(bus.idArret),
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
              final station = BusStopFull.fromJson(
                  json.decode(response.body)['results'][0]);
              return Center(child: BusDetailsView(busStopFull: station));
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
