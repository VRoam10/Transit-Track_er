// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'favorite_bus.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class FavoriteBusStopAdapter extends TypeAdapter<FavoriteBusStop> {
  @override
  final int typeId = 0;

  @override
  FavoriteBusStop read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return FavoriteBusStop(
      idLigne: fields[0] as String,
      nomCourtLigne: fields[1] as String,
      idArret: fields[2] as String,
      sens: fields[3] as int,
      name: fields[4] as String,
      alarmTime: fields[5] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, FavoriteBusStop obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.idLigne)
      ..writeByte(1)
      ..write(obj.nomCourtLigne)
      ..writeByte(2)
      ..write(obj.idArret)
      ..writeByte(3)
      ..write(obj.sens)
      ..writeByte(4)
      ..write(obj.name)
      ..writeByte(5)
      ..write(obj.alarmTime);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FavoriteBusStopAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
