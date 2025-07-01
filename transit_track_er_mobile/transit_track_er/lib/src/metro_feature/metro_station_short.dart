class MetroStation {
  final String id;
  final String name;

  MetroStation({required this.id, required this.name});

  factory MetroStation.fromJson(Map<String, dynamic> json) {
    return MetroStation(
      id: json['idjdd'],
      name: json['nomarret'],
    );
  }
}