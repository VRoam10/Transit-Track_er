import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature_backend/api_call.dart';
import 'package:transit_track_er/src/form_backend/save_bus_stop.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';
import 'package:transit_track_er/src/types/timetable.dart';

/// Displays detailed information about a Bus Stop.
class BusStopDetailsView extends StatefulWidget {
  const BusStopDetailsView({super.key, required this.bus});

  static const routeName = '/bus_stop_details_backend';
  final BusServicePoint bus;

  @override
  State<BusStopDetailsView> createState() => _BusStopDetailsViewState();
}

class _BusStopDetailsViewState extends State<BusStopDetailsView> {
  late List<Timetable> timetables = [];
  late String token = '';

  @override
  void initState() {
    super.initState();
    _loadTimetables();
  }

  Future<void> _loadTimetables() async {
    final token = await AuthService().getToken() ?? '';
    if (token.isNotEmpty) {
      final loaded = await TimetableService().fetchTimetable(token);
      setState(() {
        timetables = loaded.where((t) => t.idLine == widget.bus.id).toList();
        this.token = token;
      });
    }
  }

  void _deleteTimetable(int index) {
    Timetable timetable = timetables.removeAt(index);
    TimetableService().deleteTimetable(token, timetable);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text('${localizations.busStopDetails} #${widget.bus.idLigne}'),
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
                    return const SizedBox(width: 48);
                  } else if (snapshot.hasError) {
                    return const SizedBox.shrink();
                  }

                  return IconButton(
                    icon: const Icon(Icons.alarm_on),
                    onPressed: () {
                      showAddFavoriteBusStopDialog(context, widget.bus)
                          .then((_) {
                        _loadTimetables();
                      });
                    },
                  );
                },
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<BusStop>(
        future: fetchNextPassageBus(widget.bus.id, widget.bus.idLigne),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data == null) {
            return Center(child: Text(localizations.noBusFound));
          }

          final busStop = snapshot.data!;

          return ListView(padding: const EdgeInsets.all(8), children: [
            BusDetailsView(busStopFull: busStop),
            const SizedBox(height: 16),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: timetables.length,
              itemBuilder: (context, index) {
                final timetable = timetables[index];
                return ListTile(
                  title: Text(timetable.idLine),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete),
                    onPressed: () {
                      _deleteTimetable(index);
                    },
                  ),
                );
              },
            ),
          ]);
        },
      ),
    );
  }
}
