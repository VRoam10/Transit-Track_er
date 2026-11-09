import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:hive/hive.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/timetable.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

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
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  late Box<FavoriteBusStop> busBox;
  late Box<FavoriteStation> stationBox;
  late List<Timetable> timetables = [];
  late String token = '';
  String? _email;

  SettingsController get controller => widget.controller;

  @override
  void initState() {
    super.initState();
    busBox = Hive.box<FavoriteBusStop>('busBox');
    stationBox = Hive.box<FavoriteStation>('stationsBox');
    _loadTimetables();
  }

  Future<void> _signOut() async {
    await AuthService().logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  Future<void> _loadTimetables() async {
    final email = await AuthService().getEmail();
    if (mounted && email != null) setState(() => _email = email);
    final token = await AuthService().getToken() ?? '';
    if (token.isEmpty) return;
    try {
      final loaded = await TimetableService().fetchTimetable(token);
      if (!mounted) return;
      setState(() {
        timetables = loaded;
        this.token = token;
      });
    } catch (_) {
      // Server alarms are optional here; local ones are still shown.
    }
  }

  void _deleteBus(int index) {
    busBox.deleteAt(index);
    setState(() {});
  }

  void _deleteMetro(int index) {
    stationBox.deleteAt(index);
    setState(() {});
  }

  void _deleteTimetable(int index) {
    Timetable timetable = timetables.removeAt(index);
    TimetableService().deleteTimetable(token, timetable);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final hasAlarms =
        busBox.isNotEmpty || stationBox.isNotEmpty || timetables.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.settingsTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          SectionTitle(localizations.account),
          AccountCard(
            email: _email,
            onSignOut: _signOut,
            onSignIn: () => Navigator.of(context)
                .pushNamedAndRemoveUntil('/', (route) => false),
          ),
          SectionTitle(localizations.appearance),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: SegmentedButton<ThemeMode>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(
                    value: ThemeMode.system,
                    label: Text(localizations.systemTheme),
                  ),
                  ButtonSegment(
                    value: ThemeMode.light,
                    label: Text(localizations.lightTheme),
                  ),
                  ButtonSegment(
                    value: ThemeMode.dark,
                    label: Text(localizations.darkTheme),
                  ),
                ],
                selected: {controller.themeMode},
                onSelectionChanged: (selection) =>
                    controller.updateThemeMode(selection.first),
              ),
            ),
          ),
          SectionTitle(localizations.savedAlarms),
          if (!hasAlarms)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Icon(Icons.alarm_off_rounded,
                        color: theme.colorScheme.outline),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        localizations.noSavedAlarms,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (busBox.isNotEmpty || stationBox.isNotEmpty)
                    GroupLabel(localizations.onThisDevice),
                  for (var i = 0; i < busBox.length; i++)
                    if (busBox.getAt(i) case final bus?)
                      AlarmTile(
                        icon: Icons.directions_bus_rounded,
                        color: modeColor('bus'),
                        title: bus.name,
                        subtitle:
                            '${localizations.bus} ${bus.nomCourtLigne} · ${formatAlarmDate(context, bus.alarmTime)}',
                        onDelete: () => _deleteBus(i),
                      ),
                  for (var i = 0; i < stationBox.length; i++)
                    if (stationBox.getAt(i) case final station?)
                      AlarmTile(
                        icon: Icons.subway_rounded,
                        color: modeColor('metro'),
                        title: station.nomCourtLigne,
                        subtitle:
                            '${localizations.metro} · ${formatAlarmDate(context, station.alarmTime)}',
                        onDelete: () => _deleteMetro(i),
                      ),
                  if (timetables.isNotEmpty)
                    GroupLabel(localizations.onYourAccount),
                  for (var i = 0; i < timetables.length; i++)
                    AlarmTile(
                      icon: modeIcon(timetables[i].mode),
                      color: modeColor(timetables[i].mode),
                      title: describeCron(context, timetables[i].cron),
                      subtitle: localizations.stopId(timetables[i].idLine),
                      onDelete: () => _deleteTimetable(i),
                    ),
                  const SizedBox(height: 6),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
