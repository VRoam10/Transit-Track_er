import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/form_backend/save_metro_station.dart';
import 'package:transit_track_er/src/metro_feature_backend/api_call.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';
import 'package:transit_track_er/src/types/timetable.dart';

/// Displays detailed information about a Metro Station.
class MetroStationDetailsView extends StatefulWidget {
  const MetroStationDetailsView({super.key, required this.station});

  static const routeName = '/metro_station_details_backend';
  final MetroStation station;

  @override
  State<MetroStationDetailsView> createState() =>
      _MetroStationDetailsViewState();
}

class _MetroStationDetailsViewState extends State<MetroStationDetailsView> {
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
        timetables =
            loaded.where((t) => t.idLine == widget.station.id).toList();
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
        title: Text(
            '${localizations.metroStationDetailsTitle} #${widget.station.id}'),
        actions: [
          FutureBuilder<String?>(
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
                      showAddFavoriteStationDialog(context, widget.station)
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
      body: FutureBuilder<Station>(
        future: fetchNextPassageMetro(widget.station.id),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data == null) {
            return Center(child: Text(localizations.noStationsFound));
          }

          final station = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(8),
            children: [
              MetroDetailsView(metro: station),
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
            ],
          );
        },
      ),
    );
  }
}
