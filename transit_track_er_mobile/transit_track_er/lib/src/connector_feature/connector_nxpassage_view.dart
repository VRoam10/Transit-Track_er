import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class ConnectorNxpassageView extends StatefulWidget {
  const ConnectorNxpassageView({
    super.key,
    required this.connectorId,
    required this.stop,
    required this.token,
    this.line,
  });

  final String connectorId;
  final MetroStation stop;
  final String token;

  /// Line the stop belongs to, used for the card's badge and color.
  final MetroLine? line;

  @override
  State<ConnectorNxpassageView> createState() => _ConnectorNxpassageViewState();
}

class _ConnectorNxpassageViewState extends State<ConnectorNxpassageView> {
  Station? _passage;
  String? _error;
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final p = await fetchConnectorNxpassage(
          widget.connectorId, widget.stop.id, widget.token);
      if (!mounted) return;
      setState(() {
        _passage = p;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.stop.name)),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    // Only show the spinner on the very first load; periodic refreshes keep
    // the existing data on screen instead of flashing a spinner.
    if (_loading && _passage == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_passage == null) {
      // Error/empty states are scrollable so pull-to-refresh still works.
      final l10n = AppLocalizations.of(context)!;
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 80),
          StateMessage(
            icon: _error != null
                ? Icons.cloud_off_rounded
                : Icons.schedule_rounded,
            message: _error != null
                ? _error!.replaceFirst('Exception: ', '')
                : l10n.noPassageFound,
            onRetry: _refresh,
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        MetroDetailsView(
          metro: _passage!,
          lineName: widget.line?.shortName,
          lineColor: widget.line?.lineColor,
        ),
      ],
    );
  }
}
