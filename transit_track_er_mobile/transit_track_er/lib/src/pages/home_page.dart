import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:transit_track_er/src/bus_feature/bus_line_list_view.dart';
import 'package:transit_track_er/src/bus_feature_backend/bus_line_list_view.dart'
    as bus_backend;
import 'package:transit_track_er/src/metro_feature/metro_line_list_view.dart';
import 'package:transit_track_er/src/metro_feature_backend/metro_line_list_view.dart'
    as metro_backend;
import 'package:transit_track_er/src/service/api_service.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/settings/settings_view.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();

  static const routeName = '/home';
}

class _HomePageState extends State<HomePage> {
  final storage = const FlutterSecureStorage();
  String? token;

  @override
  void initState() {
    super.initState();
    initFirebaseAndRegisterToken();
  }

  void logout() async {
    await AuthService().logout();
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
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
                          metro_backend.MetroLineListView
                              .routeName, // navigates to /metro_line_list
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
                          BusLineListView
                              .routeName, // navigates to /bus_line_list
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
                          bus_backend.BusLineListView
                              .routeName, // navigates to /bus_line_list
                        );
                      },
                      child:
                          Text('${localizations.busStopListTitle} (Backend)'),
                    ),
                  )
                ],
              )),
        ),
        bottomNavigationBar: Container(
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: Theme.of(context).brightness == Brightness.dark
                  ? [Colors.grey[800]!, Colors.grey[850]!]
                  : [Colors.purple, Colors.deepPurple],
            ),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.black.withOpacity(0.5)
                    : Colors.purple.withOpacity(0.4),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildNavItem(Icons.home, true, () {}),
                _buildNavItem(Icons.calendar_today, false, () {}),
                _buildNavItem(Icons.message, false, () {}),
                _buildNavItem(Icons.logout_outlined, false, logout),
              ],
            ),
          ),
        ));
  }
}

Widget _buildNavItem(IconData icon, bool isActive, Function onPressed) {
  return Builder(
    builder: (context) {
      final isDark = Theme.of(context).brightness == Brightness.dark;

      return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isActive
                ? (isDark ? Colors.grey[700] : Colors.white)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(15),
          ),
          child: Container(
            padding: const EdgeInsets.all(0.0),
            width: 24.0,
            height: 24.0,
            child: IconButton(
              icon: Icon(icon),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              iconSize: 24,
              color: isActive
                  ? (isDark ? Colors.white : Colors.purple)
                  : (isDark ? Colors.grey[400] : Colors.white),
              onPressed: () {
                onPressed();
              },
            ),
          ));
    },
  );
}
