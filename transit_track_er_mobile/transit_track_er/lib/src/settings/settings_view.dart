import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';

import 'settings_controller.dart';

/// Displays the various settings that can be customized by the user.
///
/// When a user changes a setting, the SettingsController is updated and
/// Widgets that listen to the SettingsController are rebuilt.
class SettingsView extends StatefulWidget {
  final SettingsController controller;
  static const routeName = '/settings';

  const SettingsView({super.key, required this.controller});
  @override
  State<SettingsView> createState() => _SettingsViewState(this.controller);
}

class _SettingsViewState extends State<SettingsView> {
  _SettingsViewState(this.controller);
  late Box<FavoriteBusStop> busBox;
  late Box<FavoriteStation> stationBox;

  final SettingsController controller;

  @override
  void initState() {
    super.initState();
    busBox = Hive.box<FavoriteBusStop>('busBox');
    stationBox = Hive.box<FavoriteStation>('stationsBox');
  }

  void _deleteBus(int index) {
    busBox.deleteAt(index);
    setState(() {});
  }

  void _deleteMetro(int index) {
    stationBox.deleteAt(index);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.settingsTitle),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        // Glue the SettingsController to the theme selection DropdownButton.
        //
        // When a user selects a theme from the dropdown list, the
        // SettingsController is updated, which rebuilds the MaterialApp.
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButton<ThemeMode>(
                // Read the selected themeMode from the controller
                value: controller.themeMode,
                // Call the updateThemeMode method any time the user selects a theme.
                onChanged: controller.updateThemeMode,
                items: [
                  DropdownMenuItem(
                    value: ThemeMode.system,
                    child: Text(localizations.systemTheme),
                  ),
                  DropdownMenuItem(
                    value: ThemeMode.light,
                    child: Text(localizations.lightTheme),
                  ),
                  DropdownMenuItem(
                    value: ThemeMode.dark,
                    child: Text(localizations.darkTheme),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: busBox.length,
                  itemBuilder: (context, index) {
                    final bus = busBox.getAt(index);
                    return ListTile(
                      title: Text(bus?.name ?? ''),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () {
                          _deleteBus(index);
                        },
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: stationBox.length,
                  itemBuilder: (context, index) {
                    final station = stationBox.getAt(index);
                    return ListTile(
                      title: Text(station?.nomCourtLigne ?? ''),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () {
                          _deleteMetro(index);
                        },
                      ),
                    );
                  },
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
