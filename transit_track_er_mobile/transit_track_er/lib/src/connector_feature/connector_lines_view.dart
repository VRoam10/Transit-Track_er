import 'package:flutter/material.dart';
import 'package:transit_track_er/src/connector_feature/api_call.dart';
import 'package:transit_track_er/src/connector_feature/connector_directions_view.dart';
import 'package:transit_track_er/src/types/connector.dart';
import 'package:transit_track_er/src/types/metro_line.dart';

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
      final newLines = await fetchConnectorLines(
        widget.connector.id,
        offset: _offset,
      );
      setState(() {
        _lines.addAll(newLines);
        _offset += newLines.length;
        if (newLines.isEmpty) _hasMore = false;
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
      appBar: AppBar(title: Text(widget.connector.name)),
      body: _lines.isEmpty && _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _lines.isEmpty && _error != null
              ? Center(child: Text('Error: $_error'))
              : _lines.isEmpty
                  ? const Center(child: Text('No lines found'))
                  : ListView.builder(
                      itemCount: _lines.length + (_hasMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _lines.length) {
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
                        final line = _lines[index];
                        return ListTile(
                          leading: Icon(Icons.circle, color: line.lineColor),
                          title: Text(line.shortName),
                          onTap: () {
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
                      },
                    ),
    );
  }
}
