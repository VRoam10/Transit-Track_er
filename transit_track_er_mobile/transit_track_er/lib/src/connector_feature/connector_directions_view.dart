import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_stops_view.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';

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
    _futureDirections = fetchConnectorDirections(
      widget.connectorId,
      widget.line.id,
      widget.token,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.line.shortName)),
      body: FutureBuilder<List<MetroDirection>>(
        future: _futureDirections,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No directions found'));
          }

          final directions = snapshot.data!;
          return ListView.builder(
            itemCount: directions.length,
            itemBuilder: (context, index) {
              final direction = directions[index];
              return ListTile(
                leading: const Icon(Icons.directions),
                title: Text(direction.nomarretarrivee),
                subtitle: Text('Direction ${direction.sens}'),
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
              );
            },
          );
        },
      ),
    );
  }
}
