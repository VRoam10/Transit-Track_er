import 'package:flutter/material.dart';

class BusLine {
  final String id;
  final String shortName;
  final Color lineColor;

  BusLine({required this.id, required this.shortName, required this.lineColor});

  factory BusLine.fromJson(Map<String, dynamic> json) {
    print(json);
    return BusLine(
      id: json['id'],
      shortName: json['nomcourt'],
      lineColor: hexToColor(json['couleurligne']),
    );
  }
}

Color hexToColor(String hex) {
  hex = hex.replaceAll('#', '');
  if (hex.length == 6) {
    hex = 'FF$hex'; // Add alpha if not provided
  }
  return Color(int.parse(hex, radix: 16));
}