import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_nxpassage_view.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class ConnectorStopsView extends StatefulWidget {
  const ConnectorStopsView({
    super.key,
    required this.connectorId,
    required this.line,
    required this.direction,
    required this.token,
  });

  final String connectorId;
  final MetroLine line;
  final MetroDirection direction;
  final String token;

  @override
  State<ConnectorStopsView> createState() => _ConnectorStopsViewState();
}

class _ConnectorStopsViewState extends State<ConnectorStopsView> {
  final List<MetroStation> _stops = [];
  Object? _position;
  bool _isLoading = false;
  bool _hasMore = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMore();
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await fetchConnectorStops(
        widget.connectorId,
        widget.line.id,
        widget.direction.sens.toString(),
        widget.token,
        position: _position,
      );
      if (!mounted) return;
      setState(() {
        _stops.addAll(result.items);
        _position = result.next;
        _hasMore = result.next != null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final color = widget.line.lineColor;

    final Widget body;
    if (_stops.isEmpty && _isLoading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_stops.isEmpty && _error != null) {
      body = StateMessage(
        icon: Icons.cloud_off_rounded,
        message: _error!.replaceFirst('Exception: ', ''),
        onRetry: _loadMore,
      );
    } else if (_stops.isEmpty) {
      body = StateMessage(
          icon: Icons.search_off_rounded, message: l10n.noStopsFound);
    } else {
      body = ListView.builder(
        padding: const EdgeInsets.only(top: 4, bottom: 24),
        itemCount: _stops.length + (_hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _stops.length) {
            return LoadMoreButton(loading: _isLoading, onPressed: _loadMore);
          }
          final stop = _stops[index];
          return StopTile(
            name: stop.name,
            color: color,
            isFirst: index == 0,
            // While more pages exist, the route continues past this stop.
            isLast: !_hasMore && index == _stops.length - 1,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ConnectorNxpassageView(
                    connectorId: widget.connectorId,
                    stop: stop,
                    token: widget.token,
                    line: widget.line,
                  ),
                ),
              );
            },
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            LineBadge(label: widget.line.shortName, color: color, size: 32),
            const SizedBox(width: 12),
            const Icon(Icons.arrow_forward_rounded, size: 20),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                widget.direction.nomarretarrivee,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
      body: body,
    );
  }
}
