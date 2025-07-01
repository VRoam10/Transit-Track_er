import 'package:flutter/material.dart';
import 'package:transit_track_er/src/metro_feature/metro_station_list_view.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const routeName = '/';
  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
        appBar: AppBar(title: Text(localizations.appTitle)),
        body: Center(
          child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextField(
                    decoration: InputDecoration(
                      labelText: localizations.username,
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    decoration: InputDecoration(
                      labelText: localizations.password,
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      if (!loginIsValid('username', 'password')) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(localizations.loginError)),
                        );
                        return;
                      }
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(localizations.loginSuccess)),
                      );
                      Navigator.pushNamed(
                          context,
                          MetroStationListView
                              .routeName // navigates to /metro_station_list
                          );
                    },
                    child: Text(localizations.connect),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pushNamed(
                        context,
                        MetroStationListView
                            .routeName, // navigates to /metro_station_list
                      );
                    },
                    child: Text(localizations.guest),
                  ),
                ],
              )),
        ));
  }
}

bool loginIsValid(String username, String password) {
  // Implement login validation logic here with server-side verification
  return false;
}
