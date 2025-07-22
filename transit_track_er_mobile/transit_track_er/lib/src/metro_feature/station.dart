import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class Station {
  final String idjdd;
  final String idLigne;
  final String nomcourtligne;
  final int sens;
  final String destination;
  final String idArret;
  final String nomArret;
  final Coordonnees coordonnees;
  final DateTime arriveeFirstTrain;
  final DateTime departFirstTrain;
  final int? idFirstTrain;
  final DateTime arriveeSecondTrain;
  final DateTime departSecondTrain;
  final String heureExtraction;

  const Station(
      {required this.idjdd,
      required this.idLigne,
      required this.nomcourtligne,
      required this.sens,
      required this.destination,
      required this.idArret,
      required this.nomArret,
      required this.coordonnees,
      required this.arriveeFirstTrain,
      required this.departFirstTrain,
      this.idFirstTrain,
      required this.arriveeSecondTrain,
      required this.departSecondTrain,
      required this.heureExtraction});

  factory Station.fromJson(Map<String, dynamic> json) {
    return switch (json) {
      {
        "idjdd": String idjdd,
        "idligne": String idLigne,
        "nomcourtligne": String nomcourtligne,
        "sens": int sens,
        "destination": String destination,
        "idarret": String idArret,
        "nomarret": String nomArret,
        "coordonnees": Map<String, dynamic> coordonnees,
        "arriveefirsttrain": String arriveeFirstTrain,
        "departfirsttrain": String departFirstTrain,
        "idfirsttrain": int? idFirstTrain,
        "arriveesecondtrain": String arriveeSecondTrain,
        "departsecondtrain": String departSecondTrain,
        "heureextraction": String heureExtraction
      } =>
        Station(
            idjdd: idjdd,
            idLigne: idLigne,
            nomcourtligne: nomcourtligne,
            sens: sens,
            destination: destination,
            idArret: idArret,
            nomArret: nomArret,
            coordonnees: Coordonnees.fromJson(coordonnees),
            arriveeFirstTrain: DateTime.parse(arriveeFirstTrain),
            departFirstTrain: DateTime.parse(departFirstTrain),
            idFirstTrain: idFirstTrain,
            arriveeSecondTrain: DateTime.parse(arriveeSecondTrain),
            departSecondTrain: DateTime.parse(departSecondTrain),
            heureExtraction: heureExtraction),
      _ => throw const FormatException('Invalid JSON format for Station'),
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
class MetroDetailsView extends StatelessWidget {
  final Station metro;

  const MetroDetailsView({super.key, required this.metro});

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
              '${localizations.line}: ${metro.idLigne}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Text(
              '${localizations.station}: ${metro.nomArret}',
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 10),
            Text(
              '${localizations.arrivalTime}: ${metro.arriveeFirstTrain}',
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 10),
            Text(
              '${localizations.direction}: ${metro.sens}',
              style: const TextStyle(fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}
