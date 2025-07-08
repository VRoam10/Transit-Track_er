import 'package:hive/hive.dart';

part 'favorite_bus.g.dart';

@HiveType(typeId: 1)
class FavoriteBusStop extends HiveObject {
  @HiveField(0)
  final String idLigne;

  @HiveField(1)
  final String nomCourtLigne;

  @HiveField(2)
  final String idArret;

  @HiveField(3)
  final int sens;

  @HiveField(4)
  final String name;

  @HiveField(5)
  final DateTime alarmTime;

  FavoriteBusStop({
    required this.idLigne,
    required this.nomCourtLigne,
    required this.idArret,
    required this.sens,
    required this.name,
    required this.alarmTime,
  });
}
