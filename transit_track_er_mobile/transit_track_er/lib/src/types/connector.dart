class Connector {
  final String id;
  final String name;
  final String apiUrl;

  Connector({required this.id, required this.name, required this.apiUrl});

  factory Connector.fromJson(Map<String, dynamic> json) {
    return Connector(
      id: json['id'],
      name: json['name'],
      apiUrl: json['apiUrl'],
    );
  }
}