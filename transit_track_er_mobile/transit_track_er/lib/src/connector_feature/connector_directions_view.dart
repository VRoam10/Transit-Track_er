import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_stops_view.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class ConnectorDirectionsView extends StatefulWidget {
  const ConnectorDirectionsView({
    super.key,
    required this.connectorId,
    required this.line,
    required this.token,
  });

  final String connectorId;
  final MetroLine line;
  final String token;

  @override
  State<ConnectorDirectionsView> createState() =>
      _ConnectorDirectionsViewState();
}

class _ConnectorDirectionsViewState extends State<ConnectorDirectionsView> {
  late Future<List<MetroDirection>> _futureDirections;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _futureDirections = fetchConnectorDirections(
      widget.connectorId,
      widget.line.id,
      widget.token,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final color = widget.line.lineColor;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            LineBadge(label: widget.line.shortName, color: color, size: 32),
            const SizedBox(width: 12),
            Flexible(
                child: Text(
                    '${l10n.line} ${widget.line.shortName.toUpperCase()}')),
          ],
        ),
      ),
      body: AsyncBody<List<MetroDirection>>(
        future: _futureDirections,
        emptyMessage: l10n.noDirectionsFound,
        onRetry: () => setState(_load),
        builder: (context, directions) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            SectionTitle(l10n.chooseDirection),
            for (final direction in directions) ...[
              _DirectionCard(
                terminus: direction.nomarretarrivee,
                color: color,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ConnectorStopsView(
                        connectorId: widget.connectorId,
                        line: widget.line,
                        direction: direction,
                        token: widget.token,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class _DirectionCard extends StatelessWidget {
  const _DirectionCard({
    required this.terminus,
    required this.color,
    required this.onTap,
  });

  final String terminus;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.arrow_forward_rounded, color: color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l10n.direction, style: theme.textTheme.bodySmall),
                    const SizedBox(height: 2),
                    Text(
                      terminus,
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded,
                  color: theme.colorScheme.outline),
            ],
          ),
        ),
      ),
    );
  }
}
