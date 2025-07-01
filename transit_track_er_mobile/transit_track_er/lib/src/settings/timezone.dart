import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

void configureLocalTimeZone() {
  tz.initializeTimeZones();
  tz.setLocalLocation(tz.getLocation('Europe/Paris'));
}