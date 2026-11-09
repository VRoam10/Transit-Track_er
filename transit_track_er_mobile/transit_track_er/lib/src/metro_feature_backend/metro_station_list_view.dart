import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature_backend/api_call.dart';
import 'package:transit_track_er/src/metro_feature_backend/metro_station_details_view.dart';
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

  static const routeName = '/metro_station_list_backend';
}

class _MetroStationListViewState extends State<MetroStationListView> {
  late Future<List<DirectionItem>> _futureDirections;
  Future<List<MetroStation>>? _futureStops;
  int? _selectedSens;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    // Stops are requested once the first direction is known (previously two
    // requests were fired on start-up, one of them thrown away).
    _futureDirections = fetchLineDirection(widget.idLigne).then((dirs) {
      final items = dirs
          .map((d) => DirectionItem(d.sens, d.nomarretarrivee))
          .toList(growable: false);
      _selectedSens ??= items.isNotEmpty ? items.first.sens : 0;
      _futureStops = fetchAllMetroStation(widget.idLigne, _selectedSens!);
      return items;
    });
  }

  void _selectSens(int sens) {
    if (sens == _selectedSens) return;
    setState(() {
      _selectedSens = sens;
      _futureStops = fetchAllMetroStation(widget.idLigne, sens);
    });
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final color = widget.lineColor ?? Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(title: _LineTitle(widget: widget, color: color)),
      body: AsyncBody<List<DirectionItem>>(
        future: _futureDirections,
        emptyMessage: localizations.noStationsFound,
        onRetry: () => setState(_load),
        isEmpty: (_) => false,
        builder: (context, directions) => Column(
          children: [
            DirectionSelector(
              directions: directions,
              selected: _selectedSens ?? 0,
              color: color,
              onChanged: _selectSens,
            ),
            Expanded(
              child: AsyncBody<List<MetroStation>>(
                future: _futureStops,
                emptyMessage: localizations.noStationsFound,
                onRetry: () => setState(() => _futureStops =
                    fetchAllMetroStation(widget.idLigne, _selectedSens ?? 0)),
                builder: (context, stops) {
                  // Keep a single entry per stop.
                  final seen = <String>{};
                  final unique = stops.where((s) => seen.add(s.id)).toList();
                  return _StopList(stops: unique, color: color, widget: widget);
                },
              ),
            ),
          ],
        ),
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
