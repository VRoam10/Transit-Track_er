import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature/metro_station_short.dart';
import 'package:transit_track_er/src/metro_feature/api_call.dart';

import '../settings/settings_view.dart';
import 'metro_station_details_view.dart';

/// Displays a list of Metro Station.
class MetroStationListView extends StatefulWidget {
  const MetroStationListView({
    super.key,
  });

  @override
  State<MetroStationListView> createState() => _MetroStationListViewState();

  static const routeName = '/metro_station_list';
}

class _MetroStationListViewState extends State<MetroStationListView> {
  late Future<List<MetroStation>> _futureStations;

  @override
  void initState() {
    super.initState();
    _futureStations = fetchAllMetro();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.appTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.restorablePushNamed(context, SettingsView.routeName);
            },
          ),
        ],
      ),
      body: FutureBuilder<List<MetroStation>>(
        future: _futureStations,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No stations found'));
          }

          final stations = snapshot.data!;
          return ListView.builder(
            restorationId: 'metroStationListView',
            itemCount: stations.length,
            itemBuilder: (context, index) {
              final station = stations[index];
              return ListTile(
                title: Text(station.name),
                leading: const CircleAvatar(
                  foregroundImage: AssetImage('assets/images/flutter_logo.png'),
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          MetroStationDetailsView(station: station),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
