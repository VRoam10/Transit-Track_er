class BusServicePoint {
  final String idLigne;
  final String nomCourtLigne;
  final String id;
  final int sens;
  final String name;

  BusServicePoint({
    required this.idLigne,
    required this.nomCourtLigne,
    required this.id,
    required this.sens,
    required this.name,
  });

  factory BusServicePoint.fromStarJson(Map<String, dynamic> json) {
    return BusServicePoint(
      idLigne: json['idligne'],
      nomCourtLigne: json['nomcourtligne'],
      id: json['idarret'],
      sens: json['sens'],
      name: json['nomarret'],
    );
  }

  factory BusServicePoint.fromBackendJson(Map<String, dynamic> json) {
    return BusServicePoint(
      idLigne: json['id'],
      nomCourtLigne: json['name'],
      id: json['id'],
      name: json['name'],
      sens: json['direction'],
    );
  }
}
