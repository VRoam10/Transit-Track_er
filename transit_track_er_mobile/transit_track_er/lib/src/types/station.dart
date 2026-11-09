import 'package:flutter/material.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class Station {
  final String idjdd;
  final String idLigne;
  final int sens;
  final String? destination;
  final String? idArret;
  final String nomArret;
  final Coordonnees coordonnees;
  final DateTime arriveeFirstTrain;
  final DateTime? arriveeSecondTrain;
  final String heureExtraction;

  const Station(
      {required this.idjdd,
      required this.idLigne,
      required this.sens,
      this.destination,
      this.idArret,
      required this.nomArret,
      required this.coordonnees,
      required this.arriveeFirstTrain,
      this.arriveeSecondTrain,
      required this.heureExtraction});

  factory Station.fromStarJson(Map<String, dynamic> json) {
    return switch (json) {
      {
        "idjdd": String idjdd,
        "idligne": String idLigne,
        "sens": int sens,
        "destination": String destination,
        "idarret": String idArret,
        "nomarret": String nomArret,
        "coordonnees": Map<String, dynamic> coordonnees,
        "arriveefirsttrain": String arriveeFirstTrain,
        "heureextraction": String heureExtraction
      } =>
        Station(
            idjdd: idjdd,
            idLigne: idLigne,
            sens: sens,
            destination: destination,
            idArret: idArret,
            nomArret: nomArret,
            coordonnees: Coordonnees.fromJson(coordonnees),
            arriveeFirstTrain: DateTime.parse(arriveeFirstTrain),
            arriveeSecondTrain: json['arriveesecondtrain'] is String
                ? DateTime.tryParse(json['arriveesecondtrain'])
                : null,
            heureExtraction: heureExtraction),
      _ => throw const FormatException('Invalid JSON format for Station'),
    };
  }

  factory Station.fromBackendJson(Map<String, dynamic> json) {
    return switch (json) {
      {
        "id": String idjdd,
        "lineId": String idLigne,
        "direction": int sens,
        "name": String nomArret,
        "coordonnees": Map<String, dynamic> coordonnees,
        "nextTrain": String arriveeFirstTrain,
        "extraction": String heureExtraction
      } =>
        Station(
            idjdd: idjdd,
            idLigne: idLigne,
            sens: sens,
            nomArret: nomArret,
            coordonnees: Coordonnees.fromJson(coordonnees),
            arriveeFirstTrain: DateTime.parse(arriveeFirstTrain),
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

/// Next-passage card for a metro station.
class MetroDetailsView extends StatelessWidget {
  final Station metro;
  final String? lineName;
  final Color? lineColor;

  const MetroDetailsView(
      {super.key, required this.metro, this.lineName, this.lineColor});

  @override
  Widget build(BuildContext context) {
    final second = metro.arriveeSecondTrain;
    return ArrivalCard(
      lineLabel: lineName ?? metro.idLigne,
      lineColor: lineColor ?? Theme.of(context).colorScheme.primary,
      stopName: metro.nomArret,
      arrival: metro.arriveeFirstTrain,
      destination: metro.destination,
      extraArrivals: second != null ? [second] : const [],
      updatedAt: DateTime.tryParse(metro.heureExtraction),
    );
  }
}
