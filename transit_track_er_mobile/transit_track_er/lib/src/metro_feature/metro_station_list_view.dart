import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature/api_call.dart';
import 'package:transit_track_er/src/metro_feature/metro_station_details_view.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

/// Displays the stops of a metro line for the selected direction.
class MetroStationListView extends StatefulWidget {
  const MetroStationListView({
    super.key,
    required this.idLigne,
    this.lineName,
    this.lineColor,
  });

  final String idLigne;
  final String? lineName;
  final Color? lineColor;

  @override
  State<MetroStationListView> createState() => _MetroStationListViewState();

  static const routeName = '/metro_station_list';
}

class _LineData {
  const _LineData(this.directions, this.stopsBySens);
  final List<DirectionItem> directions;
  final Map<int, List<MetroStation>> stopsBySens;
}

class _MetroStationListViewState extends State<MetroStationListView> {
  late Future<_LineData> _futureData;
  int? _selectedSens;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    // Directions and stops are fetched in parallel, then grouped by
    // direction once, so switching direction is instant (no re-filtering
    // on every build).
    _futureData = Future.wait([
      fetchLineDirection(widget.idLigne),
      fetchAllMetro(widget.idLigne),
    ]).then((results) {
      final directions = (results[0] as List)
          .map((d) => DirectionItem(d.sens as int, d.nomarretarrivee as String))
          .toList(growable: false);
      final stopsBySens = <int, List<MetroStation>>{};
      final seen = <String>{};
      for (final MetroStation stop in results[1] as List) {
        // The open-data API returns one row per passage: keep one per stop.
        if (seen.add('${stop.sens}-${stop.id}')) {
          stopsBySens.putIfAbsent(stop.sens, () => []).add(stop);
        }
      }
      _selectedSens ??= directions.isNotEmpty
          ? directions.first.sens
          : (stopsBySens.keys.isNotEmpty ? stopsBySens.keys.first : 0);
      return _LineData(directions, stopsBySens);
    });
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final color = widget.lineColor ?? Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(title: _LineTitle(widget: widget, color: color)),
      body: AsyncBody<_LineData>(
        future: _futureData,
        emptyMessage: localizations.noStationsFound,
        onRetry: () => setState(_load),
        isEmpty: (data) => data.stopsBySens.isEmpty,
        builder: (context, data) {
          final stops = data.stopsBySens[_selectedSens] ?? const [];
          return Column(
            children: [
              DirectionSelector(
                directions: data.directions,
                selected: _selectedSens ?? 0,
                color: color,
                onChanged: (sens) => setState(() => _selectedSens = sens),
              ),
              Expanded(
                child: stops.isEmpty
                    ? StateMessage(
                        icon: Icons.search_off_rounded,
                        message: localizations.noStationsFound)
                    : _StopList(stops: stops, color: color, widget: widget),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _LineTitle extends StatelessWidget {
  const _LineTitle({required this.widget, required this.color});

  final MetroStationListView widget;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final name = widget.lineName;
    if (name == null) return Text(localizations.metroStationListTitle);
    return Row(
      children: [
        LineBadge(label: name, color: color, size: 32),
        const SizedBox(width: 12),
        Flexible(child: Text('${localizations.line} ${name.toUpperCase()}')),
      ],
    );
  }
}

class _StopList extends StatelessWidget {
  const _StopList({
    required this.stops,
    required this.color,
    required this.widget,
  });

  final List<MetroStation> stops;
  final Color color;
  final MetroStationListView widget;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      restorationId: 'metroStationListView',
      padding: const EdgeInsets.only(top: 4, bottom: 24),
      itemExtent: 56,
      itemCount: stops.length,
      itemBuilder: (context, index) {
        final stop = stops[index];
        return StopTile(
          name: stop.name,
          color: color,
          isFirst: index == 0,
          isLast: index == stops.length - 1,
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => MetroStationDetailsView(
                  station: stop,
                  lineName: widget.lineName,
                  lineColor: widget.lineColor,
                ),
              ),
            );
          },
        );
      },
    );
  }
}
