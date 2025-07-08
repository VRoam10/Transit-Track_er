class BusStop {
  final String idLigne;
  final String nomCourtLigne;
  final String idArret;
  final int sens;
  final String name;

  BusStop({
    required this.idLigne,
    required this.nomCourtLigne,
    required this.idArret,
    required this.sens,
    required this.name,
  });

  factory BusStop.fromJson(Map<String, dynamic> json) {
    return BusStop(
      idLigne: json['idligne'],
      nomCourtLigne: json['nomcourtligne'],
      idArret: json['idarret'],
      sens: json['sens'],
      name: json['nomarret'],
    );
  }
}
