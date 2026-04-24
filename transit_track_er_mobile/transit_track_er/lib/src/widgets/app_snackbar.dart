import 'package:flutter/material.dart';

enum _SnackbarKind { success, error, info }

class AppSnackbar {
  static void showSuccess(BuildContext context, String message) =>
      _show(context, message, _SnackbarKind.success);

  static void showError(BuildContext context, String message) =>
      _show(context, message, _SnackbarKind.error);

  static void showInfo(BuildContext context, String message) =>
      _show(context, message, _SnackbarKind.info);

  static void _show(
      BuildContext context, String message, _SnackbarKind kind) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    late final Color background;
    late final Color foreground;
    late final IconData icon;
    late final Duration duration;

    switch (kind) {
      case _SnackbarKind.success:
        background = isDark ? const Color(0xFF1E3A2A) : const Color(0xFF1F7A4C);
        foreground = Colors.white;
        icon = Icons.check_circle_rounded;
        duration = const Duration(seconds: 3);
        break;
      case _SnackbarKind.error:
        background = theme.colorScheme.error;
        foreground = theme.colorScheme.onError;
        icon = Icons.error_rounded;
        duration = const Duration(seconds: 4);
        break;
      case _SnackbarKind.info:
        background = theme.colorScheme.inverseSurface;
        foreground = theme.colorScheme.onInverseSurface;
        icon = Icons.info_rounded;
        duration = const Duration(seconds: 3);
        break;
    }

    final messenger = ScaffoldMessenger.of(context);
    messenger.clearSnackBars();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: background,
        elevation: 4,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        duration: duration,
        content: Row(
          children: [
            Icon(icon, color: foreground, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  color: foreground,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
