class BusServicePoint {
  final String idLigne;
  final String nomCourtLigne;
  final String idArret;
  final int sens;
  final String name;

  BusServicePoint({
    required this.idLigne,
    required this.nomCourtLigne,
    required this.idArret,
    required this.sens,
    required this.name,
  });

  factory BusServicePoint.fromStarJson(Map<String, dynamic> json) {
    return BusServicePoint(
      idLigne: json['idligne'],
      nomCourtLigne: json['nomcourtligne'],
      idArret: json['idarret'],
      sens: json['sens'],
      name: json['nomarret'],
    );
  }
}
