import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature/api_call.dart';
import 'package:transit_track_er/src/bus_feature/bus_short.dart';

import '../settings/settings_view.dart';
import 'bus_details_view.dart';

/// Displays a list of Bus.
class BusStopListView extends StatefulWidget {
  const BusStopListView({
    super.key, required this.idLigne
  });

  final String idLigne;

  @override
  State<BusStopListView> createState() => _BusStopListViewState(idLigne);

  static const routeName = '/bus_list';
}

class _BusStopListViewState extends State<BusStopListView> {
  _BusStopListViewState(this.idLigne);
  
  late Future<List<BusStop>> _futureStations;
  final String idLigne;

  @override
  void initState() {
    super.initState();
    _futureStations = fetchAllBusLigne(idLigne);
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
      body: FutureBuilder<List<BusStop>>(
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
            restorationId: 'BusStopListView',
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
                      builder: (context) => BusStopDetailsView(bus: station),
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
