import 'package:flutter/material.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class BusStop {
  final String? id;
  final String idLigne;
  final int sens;
  final String? destination;
  final String? idArret;
  final String nomArret;
  final Coordonnees coordonnees;
  final DateTime arriveeBus;
  final String heureExtraction;

  const BusStop(
      {this.id,
      required this.idLigne,
      required this.sens,
      this.destination,
      this.idArret,
      required this.nomArret,
      required this.coordonnees,
      required this.arriveeBus,
      required this.heureExtraction});

  factory BusStop.fromStarJson(Map<String, dynamic> json) {
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

  factory BusStop.fromBackendJson(Map<String, dynamic> json) {
    return switch (json) {
      {
        "id": String idjdd,
        "lineId": String idLigne,
        "direction": int sens,
        "name": String nomArret,
        "coordonnees": Map<String, dynamic> coordonnees,
        "nextTrain": String arriveeBus,
        "extraction": String heureExtraction
      } =>
        BusStop(
            id: idjdd,
            idLigne: idLigne,
            sens: sens,
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

/// Next-passage card for a bus stop. [upcoming] lists the following
/// passages, if known.
class BusDetailsView extends StatelessWidget {
  final BusStop busStopFull;
  final String? lineName;
  final Color? lineColor;
  final List<DateTime> upcoming;

  const BusDetailsView({
    super.key,
    required this.busStopFull,
    this.lineName,
    this.lineColor,
    this.upcoming = const [],
  });

  @override
  Widget build(BuildContext context) {
    return ArrivalCard(
      lineLabel: lineName ?? busStopFull.idLigne,
      lineColor: lineColor ?? Theme.of(context).colorScheme.primary,
      stopName: busStopFull.nomArret,
      arrival: busStopFull.arriveeBus,
      destination: busStopFull.destination,
      extraArrivals: upcoming,
      updatedAt: DateTime.tryParse(busStopFull.heureExtraction),
    );
  }
}
