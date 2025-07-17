import 'package:flutter/material.dart';

class MetroLine {
  final String id;
  final String shortName;
  final Color lineColor;

  MetroLine({required this.id, required this.shortName, required this.lineColor});

  factory MetroLine.fromJson(Map<String, dynamic> json) {
    print(json);
    return MetroLine(
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