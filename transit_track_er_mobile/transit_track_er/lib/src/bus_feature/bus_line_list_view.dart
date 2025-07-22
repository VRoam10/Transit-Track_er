import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature/api_call.dart';
import 'package:transit_track_er/src/bus_feature/bus_line.dart';
import 'package:transit_track_er/src/bus_feature/bus_list_view.dart';

/// Displays a list of Bus Station.
class BusLineListView extends StatefulWidget {
  const BusLineListView({
    super.key,
  });

  @override
  State<BusLineListView> createState() => _BusLineListViewState();

  static const routeName = '/bus_line_list';
}

class _BusLineListViewState extends State<BusLineListView> {
  late Future<List<BusLine>> _futureStations;

  @override
  void initState() {
    super.initState();
    _futureStations = fetchAllLineBus();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(localizations.appTitle)),
      body: FutureBuilder<List<BusLine>>(
        future: _futureStations,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(child: Text(localizations.noBusFound));
          }

          final stations = snapshot.data!;
          return ListView.builder(
            restorationId: 'busStationListView',
            itemCount: stations.length,
            itemBuilder: (context, index) {
              final busLine = stations[index];
              return ListTile(
                title: Text(busLine.shortName),
                leading: Icon(
                  Icons.circle,
                  color: busLine.lineColor, // This shows the color
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          BusStopListView(idLigne: busLine.id),
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
