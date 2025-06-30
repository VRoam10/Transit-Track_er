import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:transit_track_er/src/sample_feature/metro_station.dart';
import 'package:transit_track_er/src/sample_feature/test.dart'; // Ensure fetchAlbum is imported

/// Displays detailed information about a SampleItem.
class SampleItemDetailsView extends StatelessWidget {
  const SampleItemDetailsView({super.key});

  static const routeName = '/sample_item';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Item Details'),
      ),
      body: FutureBuilder<http.Response>(
        future: fetchAlbum(), // Call the fetchAlbum() function
        builder: (context, snapshot) {
          // Check if the connection is still loading
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          // If an error occurs
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          // If data is received successfully, display it
          if (snapshot.hasData) {
            final response = snapshot.data!;
            if (response.statusCode == 200) {
              // Successfully fetched data, display it
              final station = Station.fromJson(json.decode(response.body)['results'][0]);
              return Center(
                child: MetroDetailsView(metro: station)
              );
            } else {
              return Center(child: Text('Failed to load station data. Status code: ${response}'));
            }
          }

          // If no data is received (this shouldn't normally happen)
          return const Center(child: Text('No data found.'));
        },
      ),
    );
  }
}
