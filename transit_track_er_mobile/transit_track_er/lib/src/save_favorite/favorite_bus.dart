import 'package:hive/hive.dart';

part 'favorite_bus.g.dart';

@HiveType(typeId: 0)
class FavoriteStation extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  @HiveField(2)
  final DateTime alarmTime;

  FavoriteStation({
    required this.id,
    required this.name,
    required this.alarmTime,
  });
}
