import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/metro_feature_backend/api_call.dart';
import 'package:transit_track_er/src/metro_feature_backend/metro_station_list_view.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

/// Displays the metro lines as a grid of colored badges.
class MetroLineListView extends StatefulWidget {
  const MetroLineListView({
    super.key,
  });

  @override
  State<MetroLineListView> createState() => _MetroLineListViewState();

  static const routeName = '/metro_line_list_backend';
}

class _MetroLineListViewState extends State<MetroLineListView> {
  late Future<List<LineItem>> _futureLines;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    // Map once when the data arrives instead of on every rebuild.
    _futureLines = fetchAllLineMetro().then((lines) => lines
        .map((l) => LineItem(id: l.id, name: l.shortName, color: l.lineColor))
        .toList(growable: false));
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(localizations.metroStationListTitle)),
      body: AsyncBody<List<LineItem>>(
        future: _futureLines,
        emptyMessage: localizations.noStationsFound,
        onRetry: () => setState(_load),
        builder: (context, lines) => LineGrid(
          lines: lines,
          onTap: (line) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => MetroStationListView(
                  idLigne: line.id,
                  lineName: line.name,
                  lineColor: line.color,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
