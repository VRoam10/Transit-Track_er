import 'package:hive/hive.dart';

part 'favorite_station.g.dart';

@HiveType(typeId: 0)
class FavoriteStation extends HiveObject {
  @HiveField(0)
  final String idjdd;

  @HiveField(1)
  final String nomCourtLigne;

  @HiveField(2)
  final int sens;

  @HiveField(3)
  final DateTime alarmTime;

  FavoriteStation({
    required this.idjdd,
    required this.nomCourtLigne,
    required this.sens,
    required this.alarmTime,
  });
}
