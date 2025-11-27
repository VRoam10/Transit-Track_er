import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature_backend/api_call.dart';
import 'package:transit_track_er/src/form_backend/remove_bus_stop.dart';
import 'package:transit_track_er/src/form_backend/save_bus_stop.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';
import 'package:transit_track_er/src/types/timetable.dart';

/// Displays detailed information about a Bus Stop.
class BusStopDetailsView extends StatelessWidget {
  const BusStopDetailsView({super.key, required this.bus});

  static const routeName = '/bus_stop_details_backend';
  final BusServicePoint bus;

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text('${localizations.busStopDetails} #${bus.idLigne}'),
        actions: [
          FutureBuilder<String?>(
            // Don't show button while loading token
            future: AuthService().getToken(),
            builder: (context, tokenSnapshot) {
              if (tokenSnapshot.connectionState == ConnectionState.waiting) {
                return const SizedBox(width: 48);
              }

              final isConnected = tokenSnapshot.hasData &&
                  tokenSnapshot.data != null &&
                  tokenSnapshot.data!.isNotEmpty;

              if (!isConnected) {
                return const SizedBox.shrink();
              }

              return FutureBuilder<List<Timetable>>(
                future: TimetableService().fetchTimetable(tokenSnapshot.data!),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SizedBox(width: 48); // Placeholder for loading
                  } else if (snapshot.hasError) {
                    return const SizedBox.shrink(); // Hide button on error
                  }
                  final List<Timetable> timetables = snapshot.data!;

                  if (timetables
                      .any((element) => element.idLine == bus.idLigne)) {
                    return IconButton(
                      icon: const Icon(Icons.alarm_off),
                      onPressed: () {
                        Timetable timetable = timetables.firstWhere(
                            (element) => element.idLine == bus.idLigne);
                        showRemoveFavoriteBusStopDialog(
                            context, bus, timetable);
                      },
                    );
                  }

                  return IconButton(
                    icon: const Icon(Icons.alarm_on),
                    onPressed: () {
                      showAddFavoriteBusStopDialog(context, bus);
                    },
                  );
                },
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<BusStop>(
        future: fetchNextPassageBus(bus.id, bus.idLigne),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data == null) {
            return Center(child: Text(localizations.noBusFound));
          }

          final busStop = snapshot.data!;

          return Center(child: BusDetailsView(busStopFull: busStop));
        },
      ),
    );
  }
}
