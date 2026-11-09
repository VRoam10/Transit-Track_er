import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:transit_track_er/src/theme/app_theme.dart';

void main() {
  test('light theme uses the brand colors', () {
    final theme = AppTheme.light();
    expect(theme.brightness, Brightness.light);
    expect(theme.useMaterial3, isTrue);
    expect(theme.colorScheme.primary, AppColors.brandBlue);
    expect(theme.colorScheme.tertiary, AppColors.brandRed);
  });

  test('dark theme is dark and keeps readable text on surfaces', () {
    final theme = AppTheme.dark();
    expect(theme.brightness, Brightness.dark);
    expect(theme.colorScheme.brightness, Brightness.dark);
    expect(
      ThemeData.estimateBrightnessForColor(theme.scaffoldBackgroundColor),
      Brightness.dark,
    );
    expect(
      ThemeData.estimateBrightnessForColor(theme.colorScheme.onSurface),
      Brightness.light,
    );
  });

  test('buttons are at least 48dp tall in both themes', () {
    for (final theme in [AppTheme.light(), AppTheme.dark()]) {
      final size = theme.filledButtonTheme.style!.minimumSize!.resolve({});
      expect(size!.height, greaterThanOrEqualTo(48));
    }
  });
}
