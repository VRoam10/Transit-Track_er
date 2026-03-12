import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/types/metro_station.dart';
import 'package:transit_track_er/src/types/station.dart';

class ConnectorNxpassageView extends StatefulWidget {
  const ConnectorNxpassageView({
    super.key,
    required this.connectorId,
    required this.stop,
    required this.token,
  });

  final String connectorId;
  final MetroStation stop;
  final String token;

  @override
  State<ConnectorNxpassageView> createState() => _ConnectorNxpassageViewState();
}

class _ConnectorNxpassageViewState extends State<ConnectorNxpassageView> {
  late Future<Station> _futurePassage;

  @override
  void initState() {
    super.initState();
    _futurePassage = fetchConnectorNxpassage(
      widget.connectorId,
      widget.stop.id,
      widget.token,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.stop.name)),
      body: FutureBuilder<Station>(
        future: _futurePassage,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData) {
            return const Center(child: Text('No passage data found'));
          }

          final passage = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              MetroDetailsView(metro: passage),
            ],
          );
        },
      ),
    );
  }
}
