import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature_backend/api_call.dart';
import 'package:transit_track_er/src/bus_feature_backend/bus_list_view.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

/// Displays the bus lines as a grid of colored badges.
class BusLineListView extends StatefulWidget {
  const BusLineListView({
    super.key,
  });

  @override
  State<BusLineListView> createState() => _BusLineListViewState();

  static const routeName = '/bus_line_list_backend';
}

class _BusLineListViewState extends State<BusLineListView> {
  late Future<List<LineItem>> _futureLines;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    // Map once when the data arrives instead of on every rebuild.
    _futureLines = fetchAllLineBus().then((lines) => lines
        .map((l) => LineItem(id: l.id, name: l.shortName, color: l.lineColor))
        .toList(growable: false));
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(localizations.busStopListTitle)),
      body: AsyncBody<List<LineItem>>(
        future: _futureLines,
        emptyMessage: localizations.noBusFound,
        onRetry: () => setState(_load),
        builder: (context, lines) => LineGrid(
          lines: lines,
          onTap: (line) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => BusStopListView(
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
