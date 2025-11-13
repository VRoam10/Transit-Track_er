import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature_backend/api_call.dart';
import 'package:transit_track_er/src/metro_feature_backend/metro_station_details_view.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_station.dart';

/// Displays a list of Metro Station.
class MetroStationListView extends StatefulWidget {
  const MetroStationListView({
    super.key,
    required this.idLigne,
  });

  final String idLigne;

  @override
  State<MetroStationListView> createState() =>
      _MetroStationListViewState(idLigne);

  static const routeName = '/metro_station_list_backend';
}

class _MetroStationListViewState extends State<MetroStationListView> {
  _MetroStationListViewState(this.idLigne);

  final String idLigne;
  late Future<List<MetroStation>> _futureStations;
  late Future<List<MetroDirection>> _futureDirections;

  int selectedSens = 0; // Default to sens 0
  List<MetroDirection> directions = [];

  @override
  void initState() {
    super.initState();
    _futureStations = fetchAllMetroStation(idLigne, selectedSens);
    _futureDirections = fetchLineDirection(widget.idLigne);
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
      body: FutureBuilder<List<MetroStation>>(
        future: _futureStations,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(child: Text(localizations.noStationsFound));
          }

          final stations = snapshot.data!;

          // Filter stations by sens
          final filteredStations = stations
              .where((station) => station.sens == selectedSens)
              .toList();

          // Get name of selected direction
          final directionName = directions
              .firstWhere(
                (d) => d.sens == selectedSens,
                orElse: () =>
                    MetroDirection(sens: selectedSens, nomarretarrivee: ''),
              )
              .nomarretarrivee;

          return Stack(
            children: [
              Padding(
                padding: const EdgeInsets.only(
                    top: 60.0), // Offset to show list below the box
                child: ListView.builder(
                  restorationId: 'metroStationListView',
                  itemCount: filteredStations.length,
                  itemBuilder: (context, index) {
                    final station = filteredStations[index];
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
                                MetroStationDetailsView(station: station),
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
                      '${localizations.direction}: $directionName (${localizations.tapToSwitch})',
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
