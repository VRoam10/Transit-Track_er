class BusRouteDirection {
  final String nomarretarrivee;
  final int sens;

  BusRouteDirection({required this.nomarretarrivee, required this.sens});

  factory BusRouteDirection.fromJson(Map<String, dynamic> json) {
    return BusRouteDirection(
      nomarretarrivee: json['nomarretarrivee'],
      sens: json['sens'],
    );
  }
}
