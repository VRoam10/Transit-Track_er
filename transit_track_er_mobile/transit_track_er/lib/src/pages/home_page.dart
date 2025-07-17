import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:transit_track_er/src/bus_feature/bus_line_list_view.dart';
import 'package:transit_track_er/src/bus_feature/bus_list_view.dart';
import 'package:transit_track_er/src/metro_feature/metro_line_list_view.dart';
import 'package:transit_track_er/src/metro_feature/metro_station_list_view.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const routeName = '/home';
  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
        appBar: AppBar(title: Text(localizations.homeTitle)),
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
                        Navigator.pushNamed(context, BusStopListView.routeName);
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
                          MetroLineListView
                              .routeName, // navigates to /metro_line_list
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
                          BusLineListView
                              .routeName, // navigates to /metro_line_list
                        );
                      },
                      child: Text(localizations.busStopListTitle),
                    ),
                  )
                ],
              )),
        ));
  }
}

bool loginIsValid(String username, String password) {
  // Implement login validation logic here with server-side verification
  return false;
}
