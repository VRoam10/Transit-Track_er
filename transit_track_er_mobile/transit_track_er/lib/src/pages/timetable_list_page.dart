import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/timetable.dart';
import 'package:transit_track_er/src/widgets/app_snackbar.dart';
import 'package:transit_track_er/src/widgets/bottom_nav_bar.dart';

class TimetableListPage extends StatefulWidget {
  const TimetableListPage({super.key});

  static const routeName = '/timetable_list';

  @override
  State<TimetableListPage> createState() => _TimetableListPageState();
}

class _TimetableListPageState extends State<TimetableListPage> {
  late Future<List<Timetable>> _futureTimetables;
  List<Timetable> _timetables = [];
  final Set<String> _togglingIds = <String>{};

  @override
  void initState() {
    super.initState();
    _futureTimetables = _loadTimetables();
  }

  Future<List<Timetable>> _loadTimetables() async {
    final token = await AuthService().getToken() ?? '';
    if (token.isEmpty) {
      throw Exception('Not authenticated');
    }
    final list = await TimetableService().fetchTimetable(token);
    if (mounted) {
      setState(() {
        _timetables = list;
      });
    }
    return list;
  }

  Future<void> _refresh() async {
    final next = _loadTimetables();
    setState(() {
      _futureTimetables = next;
    });
    await next;
  }

  Future<void> _deleteTimetable(Timetable timetable) async {
    final localizations = AppLocalizations.of(context)!;
    final token = await AuthService().getToken() ?? '';
    if (token.isEmpty) {
      if (!mounted) return;
      AppSnackbar.showError(context, localizations.notAuthenticated);
      return;
    }
    try {
      await TimetableService().deleteTimetable(token, timetable);
      if (!mounted) return;
      AppSnackbar.showSuccess(context, localizations.timetableDeleted);
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      AppSnackbar.showError(
        context,
        '${localizations.timetableDeleteError}: $e',
      );
    }
  }

  Future<void> _toggleEnabled(Timetable timetable) async {
    if (_togglingIds.contains(timetable.id)) return;
    final localizations = AppLocalizations.of(context)!;
    final token = await AuthService().getToken() ?? '';
    if (token.isEmpty) {
      if (!mounted) return;
      AppSnackbar.showError(context, localizations.notAuthenticated);
      return;
    }

    setState(() {
      _togglingIds.add(timetable.id);
    });

    try {
      final updated = await TimetableService()
          .setTimetableEnabled(token, timetable, !timetable.enabled);
      if (!mounted) return;
      setState(() {
        final index = _timetables.indexWhere((t) => t.id == updated.id);
        if (index != -1) {
          _timetables[index] = updated;
        }
      });
      if (updated.enabled) {
        AppSnackbar.showSuccess(context, localizations.timetableEnabled);
      } else {
        AppSnackbar.showInfo(context, localizations.timetableDisabled);
      }
    } catch (e) {
      if (!mounted) return;
      AppSnackbar.showError(
        context,
        '${localizations.timetableUpdateError}: $e',
      );
    } finally {
      if (mounted) {
        setState(() {
          _togglingIds.remove(timetable.id);
        });
      }
    }
  }

  String _formatCron(String cron, AppLocalizations l) {
    final parts = cron.split(' ');
    if (parts.length < 5) return cron;
    final minute = parts[0];
    final hour = parts[1];
    final weekday = parts[4];
    final hourStr = hour.padLeft(2, '0');
    final minuteStr = minute.padLeft(2, '0');
    final day = _weekdayLabel(weekday, l);
    return '$day · $hourStr:$minuteStr';
  }

  String _weekdayLabel(String raw, AppLocalizations l) {
    switch (raw) {
      case '1':
        return l.weekdayMon;
      case '2':
        return l.weekdayTue;
      case '3':
        return l.weekdayWed;
      case '4':
        return l.weekdayThu;
      case '5':
        return l.weekdayFri;
      case '6':
        return l.weekdaySat;
      case '7':
      case '0':
        return l.weekdaySun;
      case '*':
        return l.weekdayEvery;
      default:
        return raw;
    }
  }

  IconData _modeIcon(String mode) {
    switch (mode.toLowerCase()) {
      case 'metro':
        return Icons.directions_subway;
      case 'bus':
        return Icons.directions_bus;
      default:
        return Icons.schedule;
    }
  }

  Widget _buildTrailing(Timetable timetable, ThemeData theme) {
    if (_togglingIds.contains(timetable.id)) {
      return const SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
    }
    return IconButton(
      icon: Icon(
        timetable.enabled
            ? Icons.notifications_active
            : Icons.notifications_off,
        color: timetable.enabled
            ? theme.colorScheme.primary
            : theme.disabledColor,
      ),
      onPressed: () => _toggleEnabled(timetable),
    );
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(localizations.timetableListTitle),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Timetable>>(
          future: _futureTimetables,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                _timetables.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            } else if (snapshot.hasError && _timetables.isEmpty) {
              return ListView(
                children: [
                  const SizedBox(height: 80),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        '${localizations.timetableLoadError}: ${snapshot.error}',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  ),
                ],
              );
            } else if (_timetables.isEmpty) {
              return ListView(
                children: [
                  const SizedBox(height: 80),
                  Center(
                    child: Text(
                      localizations.noTimetablesFound,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              );
            }

            return ListView.builder(
              itemCount: _timetables.length,
              itemBuilder: (context, index) {
                final timetable = _timetables[index];
                return Dismissible(
                  key: ValueKey(timetable.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    color: theme.colorScheme.error,
                    child: Icon(Icons.delete, color: theme.colorScheme.onError),
                  ),
                  confirmDismiss: (_) async {
                    return await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: Text(localizations.deleteTimetable),
                            content:
                                Text(localizations.deleteTimetableConfirmation),
                            actions: [
                              TextButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(false),
                                child: Text(localizations.cancelAction),
                              ),
                              ElevatedButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(true),
                                child: Text(localizations.continueAction),
                              ),
                            ],
                          ),
                        ) ??
                        false;
                  },
                  onDismissed: (_) => _deleteTimetable(timetable),
                  child: ListTile(
                    leading: Icon(_modeIcon(timetable.mode)),
                    title: Text(
                      '${timetable.mode.toUpperCase()} · ${timetable.idLine}',
                    ),
                    subtitle: Text(_formatCron(timetable.cron, localizations)),
                    trailing: _buildTrailing(timetable, theme),
                  ),
                );
              },
            );
          },
        ),
      ),
      bottomNavigationBar:
          const BottomNavBar(currentRoute: TimetableListPage.routeName),
    );
  }
}
