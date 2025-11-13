import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:transit_track_er/src/bus_feature_backend/api_call.dart';
import 'package:transit_track_er/src/form/remove_bus_stop.dart';
import 'package:transit_track_er/src/form/save_bus_stop.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';

/// Displays detailed information about a Bus Stop.
class BusStopDetailsView extends StatelessWidget {
  const BusStopDetailsView({super.key, required this.bus});

  static const routeName = '/bus_stop_details_backend';

  final BusServicePoint bus;

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    final busBox = Hive.box<FavoriteBusStop>('busBox');
    return Scaffold(
      appBar: AppBar(
        title: Text('${localizations.busStopDetails} #${bus.idLigne}'),
        actions: [
          ValueListenableBuilder(
            valueListenable: busBox.listenable(),
            builder: (context, Box box, _) {
              final isFavorite =
                  box.values.any((s) => s.idArret == bus.idArret);
              return IconButton(
                icon: Icon(
                  isFavorite ? Icons.alarm_off : Icons.alarm_on,
                ),
                onPressed: () {
                  if (isFavorite) {
                    showRemoveFavoriteBusStopDialog(context, busBox, bus);
                    box.delete(busBox.keys.firstWhere(
                        (k) => busBox.get(k)!.idArret == bus.idArret));
                  } else {
                    showAddFavoriteBusStopDialog(context, busBox, bus);
                  }
                },
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<List<BusStop>>(
        future: fetchNextPassageBus(bus.idArret, bus.idLigne),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(child: Text(localizations.noBusFound));
          }

          final busStop = snapshot.data!.first;

          return Center(child: BusDetailsView(busStopFull: busStop));
        },
      ),
    );
  }
}
