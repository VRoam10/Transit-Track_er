import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature/metro_line.dart';
import 'package:transit_track_er/src/metro_feature/api_call.dart';
import 'package:transit_track_er/src/metro_feature/metro_station_list_view.dart';

import '../settings/settings_view.dart';

/// Displays a list of Metro Station.
class MetroLineListView extends StatefulWidget {
  const MetroLineListView({
    super.key,
  });

  @override
  State<MetroLineListView> createState() => _MetroLineListViewState();

  static const routeName = '/metro_line_list';
}

class _MetroLineListViewState extends State<MetroLineListView> {
  late Future<List<MetroLine>> _futureStations;

  @override
  void initState() {
    super.initState();
    _futureStations = fetchAllLineMetro();
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
      body: FutureBuilder<List<MetroLine>>(
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
              final metroLine = stations[index];
              return ListTile(
                title: Text(metroLine.shortName),
                leading: Icon(
                  Icons.circle,
                  color: metroLine.lineColor, // This shows the color
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          MetroStationListView(idLigne: metroLine.id),
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
