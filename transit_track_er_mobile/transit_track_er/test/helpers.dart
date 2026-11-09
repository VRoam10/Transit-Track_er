import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:transit_track_er/src/theme/app_theme.dart';

/// Wraps [child] in a MaterialApp with the app's theme and localizations, so
/// widgets that read AppLocalizations or the color scheme can be pumped.
Widget wrap(
  Widget child, {
  Locale locale = const Locale('en'),
  Brightness brightness = Brightness.light,
}) {
  return MaterialApp(
    locale: locale,
    // InkSparkle (the Material 3 ripple) needs a shader that Flutter 3.19's
    // headless test runner can't load; use the plain ripple in tests.
    theme: (brightness == Brightness.light ? AppTheme.light() : AppTheme.dark())
        .copyWith(splashFactory: InkRipple.splashFactory),
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [Locale('en'), Locale('fr')],
    home: Scaffold(body: child),
  );
}
