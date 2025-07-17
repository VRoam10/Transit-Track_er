class MetroDirection {
  final String nomarretarrivee;
  final int sens;

  MetroDirection({required this.nomarretarrivee, required this.sens});

  factory MetroDirection.fromJson(Map<String, dynamic> json) {
    return MetroDirection(
      nomarretarrivee: json['nomarretarrivee'],
      sens: json['sens'],
    );
  }
}
