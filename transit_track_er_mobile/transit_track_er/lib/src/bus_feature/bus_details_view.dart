import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:transit_track_er/src/bus_feature/api_call.dart';
import 'package:transit_track_er/src/form/remove_bus_stop.dart';
import 'package:transit_track_er/src/form/save_bus_stop.dart';
import 'package:transit_track_er/src/save_favorite/favorite_bus.dart';
import 'package:transit_track_er/src/types/bus_service_point.dart';
import 'package:transit_track_er/src/types/bus_stop.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

/// Displays the next passages at a Bus Stop.
class BusStopDetailsView extends StatefulWidget {
  const BusStopDetailsView({
    super.key,
    required this.bus,
    this.lineName,
    this.lineColor,
  });

  static const routeName = '/bus_stop_details';

  final BusServicePoint bus;
  final String? lineName;
  final Color? lineColor;

  @override
  State<BusStopDetailsView> createState() => _BusStopDetailsViewState();
}

class _BusStopDetailsViewState extends State<BusStopDetailsView> {
  static const _refreshInterval = Duration(seconds: 30);

  final Box<FavoriteBusStop> _busBox = Hive.box<FavoriteBusStop>('busBox');
  late Future<List<BusStop>> _future;
  Timer? _autoRefresh;

  @override
  void initState() {
    super.initState();
    // Created once (it used to be created in build(), re-fetching on every
    // rebuild).
    _future = _fetch();
    _autoRefresh = Timer.periodic(_refreshInterval, (_) => _refresh());
  }

  @override
  void dispose() {
    _autoRefresh?.cancel();
    super.dispose();
  }

  Future<List<BusStop>> _fetch() =>
      fetchTestBus(widget.bus.id, widget.bus.idLigne).then((passages) {
        // Sort once here rather than in build().
        final now = DateTime.now().subtract(const Duration(minutes: 1));
        return passages.where((p) => p.arriveeBus.isAfter(now)).toList()
          ..sort((a, b) => a.arriveeBus.compareTo(b.arriveeBus));
      });

  Future<void> _refresh() {
    if (!mounted) return Future.value();
    setState(() => _future = _fetch());
    return _future.then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.bus.name),
        actions: [
          ValueListenableBuilder(
            valueListenable: _busBox.listenable(),
            builder: (context, Box box, _) {
              final isFavorite =
                  box.values.any((s) => s.idArret == widget.bus.id);
              return IconButton(
                icon: Icon(
                  isFavorite ? Icons.alarm_off : Icons.alarm_add_rounded,
                ),
                onPressed: () {
                  if (isFavorite) {
                    showRemoveFavoriteBusStopDialog(
                        context, _busBox, widget.bus);
                    box.delete(_busBox.keys.firstWhere(
                        (k) => _busBox.get(k)!.idArret == widget.bus.id));
                  } else {
                    showAddFavoriteBusStopDialog(context, _busBox, widget.bus);
                  }
                },
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: AsyncBody<List<BusStop>>(
          future: _future,
          emptyMessage: localizations.noBusFound,
          onRetry: _refresh,
          builder: (context, passages) => ListView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              BusDetailsView(
                busStopFull: passages.first,
                lineName: widget.lineName ?? widget.bus.nomCourtLigne,
                lineColor: widget.lineColor,
                upcoming: passages
                    .skip(1)
                    .take(3)
                    .map((p) => p.arriveeBus)
                    .toList(growable: false),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
