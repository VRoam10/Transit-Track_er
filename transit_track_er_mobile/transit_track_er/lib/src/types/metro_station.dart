class MetroStation {
  final String id;
  final String name;
  final int sens;

  MetroStation({required this.id, required this.name, required this.sens});

  factory MetroStation.fromStarJson(Map<String, dynamic> json) {
    return MetroStation(
      id: json['idjdd'],
      name: json['nomarret'],
      sens: json['sens'],
    );
  }
}
