class Timetable {
  final String id;
  final bool enabled;
  final String idLine;
  final String cron;
  final DateTime createdAt;
  final String mode;
  final String api;

  Timetable({
    required this.id,
    required this.enabled,
    required this.idLine,
    required this.cron,
    required this.mode,
    required this.api,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory Timetable.fromBackendJson(Map<String, dynamic> json) {
    return Timetable(
      id: json['id'],
      enabled: json['enabled'] as bool,
      // timetableData: json['timetable'],
      idLine: json['timetable']['id'],
      cron: json['timetable']['cron'],
      mode: json['timetable']['mode'],
      api: json['timetable']['api'],
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
