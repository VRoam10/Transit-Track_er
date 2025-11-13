import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature/api_call.dart';
import 'package:transit_track_er/src/bus_feature/bus_details_view.dart';
import 'package:transit_track_er/src/types/bus_direction.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';

/// Displays a list of Bus.
class BusStopListView extends StatefulWidget {
  const BusStopListView({super.key, required this.idLigne});

  final String idLigne;

  @override
  State<BusStopListView> createState() => _BusStopListViewState(idLigne);

  static const routeName = '/bus_list';
}

class _BusStopListViewState extends State<BusStopListView> {
  _BusStopListViewState(this.idLigne);

  final String idLigne;
  late Future<List<BusServicePoint>> _futureStations;
  late Future<List<BusRouteDirection>> _futureDirections;

  int selectedSens = 0; // Default to sens 0
  List<BusRouteDirection> directions = [];

  @override
  void initState() {
    super.initState();
    _futureStations = fetchAllBusLigne(idLigne);
    _futureDirections = fetchLineDirection(idLigne);
    _futureDirections.then((dirList) {
      if (dirList.isNotEmpty) {
        setState(() {
          directions = dirList;
          selectedSens = dirList.first.sens;
        });
      }
    });
  }

  void toggleSens() {
    if (directions.length < 2) return; // Only toggle if 2 directions exist
    setState(() {
      selectedSens = selectedSens == directions[0].sens
          ? directions[1].sens
          : directions[0].sens;
    });
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(localizations.appTitle)),
      body: FutureBuilder<List<BusServicePoint>>(
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

          // Filter stations by sens
          final filteredStations = stations
              .where((station) => station.sens == selectedSens)
              .toList();

          final uniqueStationsByIdarret = <String, dynamic>{};

          for (var station in filteredStations) {
            if (!uniqueStationsByIdarret.containsKey(station.id)) {
              uniqueStationsByIdarret[station.id] = station;
            }
          }

          final oneStationPerIdarret = uniqueStationsByIdarret.values.toList();

          // Get name of selected direction
          final directionName = directions
              .firstWhere(
                (d) => d.sens == selectedSens,
                orElse: () =>
                    BusRouteDirection(sens: selectedSens, nomarretarrivee: ''),
              )
              .nomarretarrivee;

          return Stack(
            children: [
              Padding(
                padding: const EdgeInsets.only(
                    top: 60.0), // Offset to show list below the box
                child: ListView.builder(
                  restorationId: 'BusStopListView',
                  itemCount: oneStationPerIdarret.length,
                  itemBuilder: (context, index) {
                    final station = oneStationPerIdarret[index];
                    return ListTile(
                      title: Text(station.name),
                      leading: const CircleAvatar(
                        foregroundImage:
                            AssetImage('assets/images/flutter_logo.png'),
                      ),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>
                                BusStopDetailsView(bus: station),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              // Fixed Top Box
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: GestureDetector(
                  onTap: toggleSens,
                  child: Container(
                    height: 60,
                    color: selectedSens == 0 ? Colors.blue : Colors.green,
                    alignment: Alignment.center,
                    child: Text(
                      '${localizations.direction}: $directionName ${localizations.tapToSwitch}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
