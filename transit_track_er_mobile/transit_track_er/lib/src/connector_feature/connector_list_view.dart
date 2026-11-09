import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_lines_view.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class ConnectorListView extends StatefulWidget {
  const ConnectorListView({super.key});

  static const routeName = '/connector_list';

  @override
  State<ConnectorListView> createState() => _ConnectorListViewState();
}

class _ConnectorListViewState extends State<ConnectorListView> {
  late Future<List<Connector>> _futureConnectors;
  String _token = '';

  @override
  void initState() {
    super.initState();
    _futureConnectors = _loadConnectors();
  }

  Future<List<Connector>> _loadConnectors() async {
    final token = await AuthService().getToken() ?? '';
    _token = token;
    if (token.isEmpty) throw const _NotSignedIn();
    return fetchConnectors(token);
  }

  void _retry() => setState(() => _futureConnectors = _loadConnectors());

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.connectors)),
      body: FutureBuilder<List<Connector>>(
        future: _futureConnectors,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.error is _NotSignedIn) {
            return StateMessage(
              icon: Icons.lock_outline_rounded,
              message: l10n.notAuthenticated,
            );
          }
          if (snapshot.hasError) {
            return StateMessage(
              icon: Icons.cloud_off_rounded,
              message: '${snapshot.error}'.replaceFirst('Exception: ', ''),
              onRetry: _retry,
            );
          }
          final connectors = snapshot.data ?? const <Connector>[];
          if (connectors.isEmpty) {
            return StateMessage(
              icon: Icons.hub_outlined,
              message: '${l10n.noConnectors}\n${l10n.noConnectorsHint}',
              onRetry: _retry,
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              _retry();
              await _futureConnectors.catchError((Object _) => <Connector>[]);
            },
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: connectors.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) => _ConnectorCard(
                connector: connectors[index],
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ConnectorLinesView(
                        connector: connectors[index],
                        token: _token,
                      ),
                    ),
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

class _NotSignedIn implements Exception {
  const _NotSignedIn();
}

/// Stable accent color for a connector, derived from its name.
Color connectorColor(String name) {
  const palette = [
    Color(0xFF1B3FD0),
    Color(0xFFD0141B),
    Color(0xFF00897B),
    Color(0xFF7B1FA2),
    Color(0xFFEF6C00),
    Color(0xFF00838F),
  ];
  final hash = name.codeUnits.fold<int>(0, (h, c) => (h * 31 + c) & 0x7fffffff);
  return palette[hash % palette.length];
}

class _ConnectorCard extends StatelessWidget {
  const _ConnectorCard({required this.connector, required this.onTap});

  final Connector connector;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = connectorColor(connector.name);
    final host = Uri.tryParse(connector.apiUrl)?.host;
    final initials = connector.name
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .take(2)
        .map((w) => w[0].toUpperCase())
        .join();

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  initials.isEmpty ? '?' : initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      connector.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.link_rounded,
                            size: 14, color: theme.colorScheme.outline),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            (host == null || host.isEmpty)
                                ? connector.apiUrl
                                : host,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                      ],
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
