// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'favorite_station.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class FavoriteStationAdapter extends TypeAdapter<FavoriteStation> {
  @override
  final int typeId = 0;

  @override
  FavoriteStation read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return FavoriteStation(
      idjdd: fields[0] as String,
      nomCourtLigne: fields[1] as String,
      sens: fields[2] as int,
      alarmTime: fields[3] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, FavoriteStation obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.idjdd)
      ..writeByte(1)
      ..write(obj.nomCourtLigne)
      ..writeByte(2)
      ..write(obj.sens)
      ..writeByte(3)
      ..write(obj.alarmTime);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FavoriteStationAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
