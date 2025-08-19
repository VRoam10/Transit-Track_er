import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class BusStop {
  final String idLigne;
  final int sens;
  final String destination;
  final String idArret;
  final String nomArret;
  final Coordonnees coordonnees;
  final DateTime arriveeBus;
  final String heureExtraction;

  const BusStop(
      {required this.idLigne,
      required this.sens,
      required this.destination,
      required this.idArret,
      required this.nomArret,
      required this.coordonnees,
      required this.arriveeBus,
      required this.heureExtraction});

  factory BusStop.fromJson(Map<String, dynamic> json) {
    print(json);
    return switch (json) {
      {
        "idligne": String idLigne,
        "sens": int sens,
        "destination": String destination,
        "idarret": String idArret,
        "nomarret": String nomArret,
        "coordonnees": Map<String, dynamic> coordonnees,
        "arrivee": String arriveeBus,
        "heureextraction": String heureExtraction
      } =>
        BusStop(
            idLigne: idLigne,
            sens: sens,
            destination: destination,
            idArret: idArret,
            nomArret: nomArret,
            coordonnees: Coordonnees.fromJson(coordonnees),
            arriveeBus: DateTime.parse(arriveeBus),
            heureExtraction: heureExtraction),
      _ => throw const FormatException('Invalid JSON format for Bus Stop'),
    };
  }
}

class Coordonnees {
  final double lon;
  final double lat;

  const Coordonnees({required this.lon, required this.lat});

  factory Coordonnees.fromJson(Map<String, dynamic> json) {
    return Coordonnees(
      lon: json['lon'],
      lat: json['lat'],
    );
  }
}

// The main widget displaying the metro information
class BusDetailsView extends StatelessWidget {
  final BusStop busStopFull;

  const BusDetailsView({super.key, required this.busStopFull});

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${localizations.line}: ${busStopFull.idLigne}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Text(
              '${localizations.station}: ${busStopFull.nomArret}',
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 10),
            Text(
              '${localizations.arrivalTime}: ${busStopFull.arriveeBus}',
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 10),
            Text(
              '${localizations.direction}: ${busStopFull.sens}',
              style: const TextStyle(fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}
