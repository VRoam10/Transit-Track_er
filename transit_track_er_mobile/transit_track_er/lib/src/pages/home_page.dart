import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature/bus_line_list_view.dart';
import 'package:transit_track_er/src/bus_feature_backend/bus_line_list_view.dart'
    as bus_backend;
import 'package:transit_track_er/src/connector_feature/connector_list_view.dart';
import 'package:transit_track_er/src/metro_feature/metro_line_list_view.dart';
import 'package:transit_track_er/src/metro_feature_backend/metro_line_list_view.dart'
    as metro_backend;
import 'package:transit_track_er/src/service/api_service.dart';
import 'package:transit_track_er/src/settings/settings_view.dart';
import 'package:transit_track_er/src/widgets/bottom_nav_bar.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();

  static const routeName = '/home';
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    initFirebaseAndRegisterToken();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
        appBar: AppBar(
          title: Text(localizations.homeTitle),
          actions: [
            IconButton(
              icon: const Icon(Icons.settings),
              onPressed: () {
                Navigator.restorablePushNamed(context, SettingsView.routeName);
              },
            ),
          ],
        ),
        body: Center(
          child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          MetroLineListView.routeName,
                        );
                      },
                      child: Text(localizations.metroStationListTitle),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          metro_backend.MetroLineListView.routeName,
                        );
                      },
                      child: Text(
                          '${localizations.metroStationListTitle} (Backend)'),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          BusLineListView.routeName,
                        );
                      },
                      child: Text(localizations.busStopListTitle),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          bus_backend.BusLineListView.routeName,
                        );
                      },
                      child:
                          Text('${localizations.busStopListTitle} (Backend)'),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          ConnectorListView.routeName,
                        );
                      },
                      child: const Text('Connectors'),
                    ),
                  ),
                ],
              )),
        ),
        bottomNavigationBar: const BottomNavBar(currentRoute: HomePage.routeName));
  }
}
