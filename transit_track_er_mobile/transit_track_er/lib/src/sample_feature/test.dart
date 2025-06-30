import 'package:http/http.dart' as http;

Future<http.Response> fetchAlbum() async {
  final response = await http.get(Uri.parse('https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-metro-circulation-deux-prochains-passages-tr/records?limit=20&refine=idligne%3A%221001%22&refine=idarret%3A%225001%22 '));
  return response;
}