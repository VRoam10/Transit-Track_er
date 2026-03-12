import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_lines_view.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/types/connector.dart';

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
    return fetchConnectors(token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Connectors')),
      body: FutureBuilder<List<Connector>>(
        future: _futureConnectors,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No connectors found'));
          }

          final connectors = snapshot.data!;
          return ListView.builder(
            itemCount: connectors.length,
            itemBuilder: (context, index) {
              final connector = connectors[index];
              return ListTile(
                leading: const Icon(Icons.cloud_queue),
                title: Text(connector.name),
                subtitle: Text(connector.apiUrl),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ConnectorLinesView(
                        connector: connector,
                        token: _token,
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
