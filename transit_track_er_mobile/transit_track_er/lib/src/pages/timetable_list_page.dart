import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/service/timetable_service.dart';
import 'package:transit_track_er/src/types/timetable.dart';
import 'package:transit_track_er/src/widgets/app_snackbar.dart';
import 'package:transit_track_er/src/widgets/bottom_nav_bar.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

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

  Future<bool> _confirmDelete() async {
    final localizations = AppLocalizations.of(context)!;
    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        final scheme = Theme.of(context).colorScheme;
        return AlertDialog(
          icon: CircleAvatar(
            radius: 28,
            backgroundColor: scheme.errorContainer,
            foregroundColor: scheme.onErrorContainer,
            child: const Icon(Icons.delete_outline_rounded, size: 28),
          ),
          title: Text(localizations.deleteTimetable),
          content: Text(localizations.deleteTimetableConfirmation,
              textAlign: TextAlign.center),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(localizations.cancelAction),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: scheme.error,
                foregroundColor: scheme.onError,
                minimumSize: const Size(120, 44),
              ),
              onPressed: () => Navigator.of(context).pop(true),
              child: Text(localizations.continueAction),
            ),
          ],
        );
      },
    );
    return result ?? false;
  }

  Widget _buildTile(Timetable timetable, ThemeData theme) {
    final localizations = AppLocalizations.of(context)!;
    final color = modeColor(timetable.mode);
    final enabled = timetable.enabled;
    final mode = timetable.mode.toLowerCase() == 'bus'
        ? localizations.bus
        : localizations.metro;

    return Dismissible(
      key: ValueKey(timetable.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(
          color: theme.colorScheme.error,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(Icons.delete_outline_rounded,
            color: theme.colorScheme.onError),
      ),
      confirmDismiss: (_) => _confirmDelete(),
      onDismissed: (_) => _deleteTimetable(timetable),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: color.withOpacity(enabled ? 0.14 : 0.06),
                foregroundColor: enabled
                    ? (theme.brightness == Brightness.dark
                        ? Color.lerp(color, Colors.white, 0.45)
                        : color)
                    : theme.disabledColor,
                child: Icon(modeIcon(timetable.mode)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Opacity(
                  opacity: enabled ? 1 : 0.55,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        describeCron(context, timetable.cron),
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$mode · ${localizations.stopId(timetable.idLine)}',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              if (_togglingIds.contains(timetable.id))
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 18),
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              else
                Switch(
                  value: enabled,
                  onChanged: (_) => _toggleEnabled(timetable),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    Widget scrollableMessage(IconData icon, String message,
        {bool retry = false}) {
      // Scrollable so pull-to-refresh keeps working on empty/error states.
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 60),
          StateMessage(
            icon: icon,
            message: message,
            onRetry: retry ? _refresh : null,
          ),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(localizations.timetableListTitle),
      ),
      extendBody: true,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Timetable>>(
          future: _futureTimetables,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                _timetables.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            } else if (snapshot.hasError && _timetables.isEmpty) {
              return scrollableMessage(
                Icons.cloud_off_rounded,
                '${localizations.timetableLoadError}\n'
                '${'${snapshot.error}'.replaceFirst('Exception: ', '')}',
                retry: true,
              );
            } else if (_timetables.isEmpty) {
              return scrollableMessage(
                Icons.alarm_off_rounded,
                '${localizations.noTimetablesFound}\n${localizations.noSavedAlarms}',
              );
            }

            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              itemCount: _timetables.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) =>
                  _buildTile(_timetables[index], theme),
            );
          },
        ),
      ),
      bottomNavigationBar:
          const BottomNavBar(currentRoute: TimetableListPage.routeName),
    );
  }
}
