class MetroDirection {
  final String nomarretarrivee;
  final int sens;

  MetroDirection({required this.nomarretarrivee, required this.sens});

  factory MetroDirection.fromStarJson(Map<String, dynamic> json) {
    return MetroDirection(
      nomarretarrivee: json['nomarretarrivee'],
      sens: json['sens'],
    );
  }
}
