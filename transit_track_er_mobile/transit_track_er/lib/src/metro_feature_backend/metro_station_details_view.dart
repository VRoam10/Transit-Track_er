import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:transit_track_er/src/form/remove_metro_station.dart';
import 'package:transit_track_er/src/form/save_metro_station.dart';
import 'package:transit_track_er/src/metro_feature_backend/api_call.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart'; // Ensure fetchMetro is imported
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

/// Displays detailed information about a Metro Station.
class MetroStationDetailsView extends StatelessWidget {
  const MetroStationDetailsView({super.key, required this.station});

  static const routeName = '/metro_station_details_backend';

  final MetroStation station;

  @override
  Widget build(BuildContext context) {
    final stationBox = Hive.box<FavoriteStation>('stationsBox');
    final localizations = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text('${localizations.metroStationDetailsTitle} #${station.id}'),
        actions: [
          ValueListenableBuilder(
            valueListenable: stationBox.listenable(),
            builder: (context, Box box, _) {
              final isFavorite = box.values.any((s) => s.idjdd == station.id);
              return IconButton(
                icon: Icon(
                  isFavorite ? Icons.alarm_off : Icons.alarm_on,
                ),
                onPressed: () {
                  if (isFavorite) {
                    showRemoveFavoriteStationDialog(
                        context, stationBox, station);
                    box.delete(stationBox.keys.firstWhere(
                        (k) => stationBox.get(k)!.idjdd == station.id));
                  } else {
                    showAddFavoriteStationDialog(context, stationBox, station);
                  }
                },
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<Station>(
        future: fetchNextPassageMetro(station.id),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data == null) {
            return Center(child: Text(localizations.noStationsFound));
          }

          final station = snapshot.data!;
          // If no data is received (this shouldn't normally happen)
          return Center(child: MetroDetailsView(metro: station));
        },
      ),
    );
  }
}
