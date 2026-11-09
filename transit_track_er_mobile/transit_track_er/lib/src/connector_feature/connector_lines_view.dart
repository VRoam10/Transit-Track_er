import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_directions_view.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class ConnectorLinesView extends StatefulWidget {
  const ConnectorLinesView({
    super.key,
    required this.connector,
    required this.token,
  });

  final Connector connector;
  final String token;

  @override
  State<ConnectorLinesView> createState() => _ConnectorLinesViewState();
}

class _ConnectorLinesViewState extends State<ConnectorLinesView> {
  final List<MetroLine> _lines = [];
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
      final result = await fetchConnectorLines(
        widget.connector.id,
        widget.token,
        position: _position,
      );
      if (!mounted) return;
      setState(() {
        _lines.addAll(result.items);
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
    final Widget body;
    if (_lines.isEmpty && _isLoading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_lines.isEmpty && _error != null) {
      body = StateMessage(
        icon: Icons.cloud_off_rounded,
        message: _error!.replaceFirst('Exception: ', ''),
        onRetry: _loadMore,
      );
    } else if (_lines.isEmpty) {
      body = StateMessage(
          icon: Icons.search_off_rounded, message: l10n.noLinesFound);
    } else {
      body = LineGrid(
        lines: [
          for (final l in _lines)
            LineItem(id: l.id, name: l.shortName, color: l.lineColor),
        ],
        footer: _hasMore
            ? LoadMoreButton(loading: _isLoading, onPressed: _loadMore)
            : null,
        onTap: (item) {
          final line = _lines.firstWhere((l) => l.id == item.id);
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ConnectorDirectionsView(
                connectorId: widget.connector.id,
                line: line,
                token: widget.token,
              ),
            ),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(widget.connector.name)),
      body: body,
    );
  }
}
