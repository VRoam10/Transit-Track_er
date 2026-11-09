import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/bus_feature/bus_line_list_view.dart';
import 'package:transit_track_er/src/bus_feature_backend/bus_line_list_view.dart'
    as bus_backend;
import 'package:transit_track_er/src/metro_feature/metro_line_list_view.dart';
import 'package:transit_track_er/src/metro_feature_backend/metro_line_list_view.dart'
    as metro_backend;
import 'package:transit_track_er/src/service/api_service.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/settings/settings_view.dart';
import 'package:transit_track_er/src/theme/app_theme.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();

  static const routeName = '/home';
}

class _HomePageState extends State<HomePage> {
  String? _email;

  @override
  void initState() {
    super.initState();
    AuthService().getEmail().then((email) {
      if (mounted && email != null) setState(() => _email = email);
    });
    // Fire-and-forget: never block the UI on push registration, and don't
    // let a failure surface as an unhandled async error.
    initFirebaseAndRegisterToken().catchError((Object _) {});
  }

  Future<void> logout() async {
    await AuthService().logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(localizations.homeTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {
              Navigator.restorablePushNamed(context, SettingsView.routeName);
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 120),
        children: [
          _HeroHeader(
            title: localizations.chooseTransport,
            subtitle: localizations.welcomeSubtitle,
          ),
          const SizedBox(height: 12),
          AccountCard(
            email: _email,
            onSignOut: logout,
            onSignIn: () => Navigator.of(context)
                .pushNamedAndRemoveUntil('/', (route) => false),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _TransportTile(
                  icon: Icons.subway_rounded,
                  title: localizations.metro,
                  subtitle: localizations.metroStationListTitle,
                  badge: localizations.liveData,
                  color: AppColors.brandRed,
                  onTap: () =>
                      Navigator.pushNamed(context, MetroLineListView.routeName),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _TransportTile(
                  icon: Icons.directions_bus_rounded,
                  title: localizations.bus,
                  subtitle: localizations.busStopListTitle,
                  badge: localizations.liveData,
                  color: AppColors.brandBlue,
                  onTap: () =>
                      Navigator.pushNamed(context, BusLineListView.routeName),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                _BackendTile(
                  icon: Icons.subway_outlined,
                  title: localizations.metroStationListTitle,
                  subtitle: localizations.backendData,
                  onTap: () => Navigator.pushNamed(
                      context, metro_backend.MetroLineListView.routeName),
                ),
                Divider(
                    height: 1,
                    indent: 72,
                    color: scheme.outlineVariant.withOpacity(0.5)),
                _BackendTile(
                  icon: Icons.directions_bus_outlined,
                  title: localizations.busStopListTitle,
                  subtitle: localizations.backendData,
                  onTap: () => Navigator.pushNamed(
                      context, bus_backend.BusLineListView.routeName),
                ),
              ],
            ),
          ),
        ],
      ),
      extendBody: true,
      bottomNavigationBar: SafeArea(
        child: Container(
          margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? Color.alphaBlend(
                    scheme.primary.withOpacity(0.16), scheme.surface)
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
              _NavItem(
                  icon: Icons.home_rounded, isActive: true, onPressed: () {}),
              _NavItem(icon: Icons.calendar_today_rounded, onPressed: () {}),
              _NavItem(
                  icon: Icons.chat_bubble_outline_rounded, onPressed: () {}),
              _NavItem(icon: Icons.logout_rounded, onPressed: logout),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroHeader extends StatelessWidget {
  const _HeroHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.brandBlue, Color(0xFF0D2387)],
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 72,
            height: 72,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Image.asset(
              'assets/images/transit_tracker_logo.png',
              // Decode at display size instead of the full 500x500 image.
              cacheWidth: 180,
            ),
          ),
        ],
      ),
    );
  }
}

class _TransportTile extends StatelessWidget {
  const _TransportTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String badge;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Lighter tint in dark mode so the brand colors keep enough contrast.
    final color = theme.brightness == Brightness.dark
        ? Color.lerp(this.color, Colors.white, 0.45)!
        : this.color;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: color, size: 28),
                  ),
                  Icon(Icons.arrow_outward_rounded,
                      color: theme.colorScheme.outline, size: 20),
                ],
              ),
              const SizedBox(height: 28),
              Text(
                title,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 2),
              Text(subtitle, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xFF1DB954),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(badge, style: theme.textTheme.labelSmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BackendTile extends StatelessWidget {
  const _BackendTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: scheme.secondaryContainer,
        foregroundColor: scheme.onSecondaryContainer,
        child: Icon(icon),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      trailing: Icon(Icons.chevron_right_rounded, color: scheme.outline),
      onTap: onTap,
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.onPressed,
    this.isActive = false,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeBg = isDark ? Colors.white.withOpacity(0.16) : Colors.white;
    final activeFg = isDark ? Colors.white : AppColors.brandBlue;
    final inactiveFg = Colors.white.withOpacity(0.75);

    // 48x48 touch target (the previous icons were only 24x24 tappable).
    return Material(
      color: isActive ? activeBg : Colors.transparent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onPressed,
        child: SizedBox(
          width: 56,
          height: 48,
          child: Icon(icon, color: isActive ? activeFg : inactiveFg),
        ),
      ),
    );
  }
}
