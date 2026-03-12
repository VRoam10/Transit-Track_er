import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_nxpassage_view.dart';
import 'package:transit_track_er/src/types/metro_direction.dart';
import 'package:transit_track_er/src/types/metro_line.dart';
import 'package:transit_track_er/src/types/metro_station.dart';

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
  int _offset = 0;
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
      final newStops = await fetchConnectorStops(
        widget.connectorId,
        widget.line.id,
        widget.direction.sens.toString(),
        widget.token,
        offset: _offset,
      );
      setState(() {
        _stops.addAll(newStops);
        _offset += newStops.length;
        if (newStops.isEmpty) _hasMore = false;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
            '${widget.line.shortName} → ${widget.direction.nomarretarrivee}'),
      ),
      body: _stops.isEmpty && _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _stops.isEmpty && _error != null
              ? Center(child: Text('Error: $_error'))
              : _stops.isEmpty
                  ? const Center(child: Text('No stops found'))
                  : ListView.builder(
                      itemCount: _stops.length + (_hasMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _stops.length) {
                          return _isLoading
                              ? const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                      child: CircularProgressIndicator()),
                                )
                              : TextButton(
                                  onPressed: _loadMore,
                                  child: const Text('Load more'),
                                );
                        }
                        final stop = _stops[index];
                        return ListTile(
                          leading: const Icon(Icons.stop_circle_outlined),
                          title: Text(stop.name),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ConnectorNxpassageView(
                                  connectorId: widget.connectorId,
                                  stop: stop,
                                  token: widget.token,
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
    );
  }
}
