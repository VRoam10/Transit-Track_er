import 'package:flutter/material.dart';
import 'package:transit_track_er/src/pages/home_page.dart';
import 'package:transit_track_er/src/pages/timetable_list_page.dart';
import 'package:transit_track_er/src/service/auth_service.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [Colors.grey[800]!, Colors.grey[850]!]
              : [Colors.purple, Colors.deepPurple],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withOpacity(0.5)
                : Colors.purple.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _BottomNavItem(
              icon: Icons.home,
              isActive: currentRoute == HomePage.routeName,
              onPressed: () => _goTo(context, HomePage.routeName),
            ),
            _BottomNavItem(
              icon: Icons.calendar_today,
              isActive: currentRoute == TimetableListPage.routeName,
              onPressed: () => _goTo(context, TimetableListPage.routeName),
            ),
            _BottomNavItem(
              icon: Icons.message,
              isActive: false,
              onPressed: () {},
            ),
            _BottomNavItem(
              icon: Icons.logout_outlined,
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
    final borderRadius = BorderRadius.circular(18);

    return Material(
      color: isActive
          ? (isDark ? Colors.grey[700] : Colors.white)
          : Colors.transparent,
      borderRadius: borderRadius,
      child: InkWell(
        onTap: onPressed,
        borderRadius: borderRadius,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Icon(
            icon,
            size: 28,
            color: isActive
                ? (isDark ? Colors.white : Colors.purple)
                : (isDark ? Colors.grey[400] : Colors.white),
          ),
        ),
      ),
    );
  }
}
