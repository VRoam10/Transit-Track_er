import 'package:flutter/material.dart';
import 'package:transit_track_er/src/pages/home_page.dart';
import 'package:transit_track_er/src/pages/timetable_list_page.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/theme/app_theme.dart';

class BottomNavBar extends StatelessWidget {
  const BottomNavBar({super.key, required this.currentRoute});

  final String currentRoute;

  Future<void> _logout(BuildContext context) async {
    await AuthService().logout();
    if (!context.mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  void _goTo(BuildContext context, String routeName) {
    if (currentRoute == routeName) return;
    final Widget destination;
    switch (routeName) {
      case HomePage.routeName:
        destination = const HomePage();
        break;
      case TimetableListPage.routeName:
        destination = const TimetableListPage();
        break;
      default:
        return;
    }
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        settings: RouteSettings(name: routeName),
        pageBuilder: (_, __, ___) => destination,
        transitionDuration: const Duration(milliseconds: 20),
        reverseTransitionDuration: const Duration(milliseconds: 180),
        transitionsBuilder: (_, animation, __, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: isDark
              ? Color.alphaBlend(theme.colorScheme.primary.withOpacity(0.16),
                  theme.colorScheme.surface)
              : AppColors.brandBlue,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.18),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _BottomNavItem(
              icon: Icons.home_rounded,
              isActive: currentRoute == HomePage.routeName,
              onPressed: () => _goTo(context, HomePage.routeName),
            ),
            _BottomNavItem(
              icon: Icons.calendar_today_rounded,
              isActive: currentRoute == TimetableListPage.routeName,
              onPressed: () => _goTo(context, TimetableListPage.routeName),
            ),
            _BottomNavItem(
              icon: Icons.chat_bubble_outline_rounded,
              isActive: false,
              onPressed: () {},
            ),
            _BottomNavItem(
              icon: Icons.logout_rounded,
              isActive: false,
              onPressed: () => _logout(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomNavItem extends StatelessWidget {
  const _BottomNavItem({
    required this.icon,
    required this.isActive,
    required this.onPressed,
  });

  final IconData icon;
  final bool isActive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeBg = isDark ? Colors.white.withOpacity(0.16) : Colors.white;
    final activeFg = isDark ? Colors.white : AppColors.brandBlue;
    final inactiveFg = Colors.white.withOpacity(0.75);
    final borderRadius = BorderRadius.circular(18);

    return Material(
      color: isActive ? activeBg : Colors.transparent,
      borderRadius: borderRadius,
      child: InkWell(
        onTap: onPressed,
        borderRadius: borderRadius,
        child: SizedBox(
          width: 56,
          height: 48,
          child: Icon(icon, color: isActive ? activeFg : inactiveFg),
        ),
      ),
    );
  }
}
