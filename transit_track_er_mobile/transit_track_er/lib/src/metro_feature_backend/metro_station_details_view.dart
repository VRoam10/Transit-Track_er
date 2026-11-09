import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature_backend/api_call.dart';
import 'package:transit_track_er/src/form_backend/save_metro_station.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';
import 'package:transit_track_er/src/types/timetable.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

/// Displays the next passage at a metro stop (via the backend) and the
/// user's alarms for it.
class MetroStationDetailsView extends StatefulWidget {
  const MetroStationDetailsView({
    super.key,
    required this.station,
    this.lineName,
    this.lineColor,
  });

  static const routeName = '/metro_station_details_backend';
  final MetroStation station;
  final String? lineName;
  final Color? lineColor;

  @override
  State<MetroStationDetailsView> createState() =>
      _MetroStationDetailsViewState();
}

class _MetroStationDetailsViewState extends State<MetroStationDetailsView> {
  static const _refreshInterval = Duration(seconds: 30);

  List<Timetable> timetables = [];
  String token = '';
  late Future<Station> _future;
  Timer? _autoRefresh;

  @override
  void initState() {
    super.initState();
    // Requests are created once here. Previously build() fired a token read,
    // a timetable request and a next-passage request on every rebuild.
    _future = _fetch();
    _loadTimetables();
    _autoRefresh = Timer.periodic(_refreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _autoRefresh?.cancel();
    super.dispose();
  }

  Future<Station> _fetch() => fetchNextPassageMetro(widget.station.id);

  Future<void> _refresh() {
    if (!mounted) return Future.value();
    setState(() => _future = _fetch());
    return _future.then((_) {}, onError: (_) {});
  }

  Future<void> _loadTimetables() async {
    final token = await AuthService().getToken() ?? '';
    if (token.isEmpty || !mounted) return;
    setState(() => this.token = token);
    try {
      final loaded = await TimetableService().fetchTimetable(token);
      if (!mounted) return;
      setState(() {
        timetables =
            loaded.where((t) => t.idLine == widget.station.id).toList();
      });
    } catch (_) {
      // Alarms are optional on this screen; keep showing the passages.
    }
  }

  void _deleteTimetable(int index) {
    Timetable timetable = timetables.removeAt(index);
    TimetableService().deleteTimetable(token, timetable);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.station.name),
        actions: [
          if (token.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.alarm_add_rounded),
              onPressed: () {
                showAddFavoriteStationDialog(context, widget.station).then((_) {
                  _loadTimetables();
                });
              },
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: AsyncBody<Station>(
          future: _future,
          emptyMessage: localizations.noStationsFound,
          onRetry: _refresh,
          isEmpty: (_) => false,
          builder: (context, data) => ListView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              MetroDetailsView(
                metro: data,
                lineName: widget.lineName,
                lineColor: widget.lineColor,
              ),
              if (timetables.isNotEmpty) ...[
                SectionTitle(localizations.savedAlarms),
                Card(
                  child: Column(
                    children: [
                      for (var i = 0; i < timetables.length; i++)
                        AlarmTile(
                          title: describeCron(timetables[i].cron),
                          subtitle: timetables[i].mode,
                          onDelete: () => _deleteTimetable(i),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
