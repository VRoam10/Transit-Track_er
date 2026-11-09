import 'dart:async';

import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:transit_track_er/src/form/remove_metro_station.dart';
import 'package:transit_track_er/src/form/save_metro_station.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature/api_call.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';
import 'package:transit_track_er/src/save_favorite/favorite_station.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

/// Displays the next passages at a Metro Station.
class MetroStationDetailsView extends StatefulWidget {
  const MetroStationDetailsView({
    super.key,
    required this.station,
    this.lineName,
    this.lineColor,
  });

  static const routeName = '/metro_station_details';

  final MetroStation station;
  final String? lineName;
  final Color? lineColor;

  @override
  State<MetroStationDetailsView> createState() =>
      _MetroStationDetailsViewState();
}

class _MetroStationDetailsViewState extends State<MetroStationDetailsView> {
  static const _refreshInterval = Duration(seconds: 30);

  final Box<FavoriteStation> _stationBox =
      Hive.box<FavoriteStation>('stationsBox');
  late Future<List<Station>> _future;
  Timer? _autoRefresh;

  @override
  void initState() {
    super.initState();
    // The request is created once here (it used to be created in build(),
    // re-fetching on every rebuild, e.g. when the favorite icon changed).
    _future = fetchTestMetro(widget.station.id);
    _autoRefresh = Timer.periodic(_refreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _autoRefresh?.cancel();
    super.dispose();
  }

  Future<void> _refresh() {
    if (!mounted) return Future.value();
    setState(() => _future = fetchTestMetro(widget.station.id));
    return _future.then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.station.name),
        actions: [
          ValueListenableBuilder(
            valueListenable: _stationBox.listenable(),
            builder: (context, Box box, _) {
              final isFavorite =
                  box.values.any((s) => s.idjdd == widget.station.id);
              return IconButton(
                icon: Icon(
                  isFavorite ? Icons.alarm_off : Icons.alarm_add_rounded,
                ),
                onPressed: () {
                  if (isFavorite) {
                    showRemoveFavoriteStationDialog(
                        context, _stationBox, widget.station);
                    box.delete(_stationBox.keys.firstWhere(
                        (k) => _stationBox.get(k)!.idjdd == widget.station.id));
                  } else {
                    showAddFavoriteStationDialog(
                        context, _stationBox, widget.station);
                  }
                },
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: AsyncBody<List<Station>>(
          future: _future,
          emptyMessage: localizations.noStationsFound,
          onRetry: _refresh,
          builder: (context, data) => ListView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              MetroDetailsView(
                metro: data.first,
                lineName: widget.lineName,
                lineColor: widget.lineColor,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
