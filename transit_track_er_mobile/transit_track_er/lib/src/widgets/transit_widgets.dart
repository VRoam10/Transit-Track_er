import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

/// Picks black or white text for the best contrast on [background].
Color onColor(Color background) =>
    ThemeData.estimateBrightnessForColor(background) == Brightness.dark
        ? Colors.white
        : Colors.black87;

String _two(int n) => n.toString().padLeft(2, '0');

/// Formats a time as HH:mm in local time.
String formatClock(DateTime time) {
  final t = time.toLocal();
  return '${_two(t.hour)}:${_two(t.minute)}';
}

/// Rounded, colored badge showing a line's short name (e.g. "a", "C1").
class LineBadge extends StatelessWidget {
  const LineBadge({
    super.key,
    required this.label,
    required this.color,
    this.size = 44,
  });

  final String label;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(minWidth: size),
      height: size,
      padding: EdgeInsets.symmetric(horizontal: size * 0.18),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      // widthFactor keeps the badge hugging its label instead of expanding.
      child: Center(
        widthFactor: 1,
        child: Text(
          label.toUpperCase(),
          maxLines: 1,
          style: TextStyle(
            color: onColor(color),
            fontWeight: FontWeight.w800,
            fontSize: size * 0.38,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }
}

/// Loading / error / empty states shared by every data screen.
class StateMessage extends StatelessWidget {
  const StateMessage({
    super.key,
    required this.icon,
    required this.message,
    this.onRetry,
  });

  final IconData icon;
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: scheme.primaryContainer.withOpacity(0.6),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 36, color: scheme.primary),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.tonalIcon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(AppLocalizations.of(context)!.retry),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Builds [builder] once [future] completes, with consistent loading, error
/// (with retry) and empty states.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.future,
    required this.builder,
    required this.emptyMessage,
    this.onRetry,
    this.isEmpty,
  });

  final Future<T>? future;
  final Widget Function(BuildContext context, T data) builder;
  final String emptyMessage;
  final VoidCallback? onRetry;
  final bool Function(T data)? isEmpty;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return StateMessage(
            icon: Icons.cloud_off_rounded,
            message: '${snapshot.error}'.replaceFirst('Exception: ', ''),
            onRetry: onRetry,
          );
        }
        final data = snapshot.data;
        final empty = data == null ||
            (isEmpty?.call(data) ?? (data is List && data.isEmpty));
        if (empty) {
          return StateMessage(
            icon: Icons.search_off_rounded,
            message: emptyMessage,
            onRetry: onRetry,
          );
        }
        return builder(context, data as T);
      },
    );
  }
}

/// A line as shown in the line picker grid.
class LineItem {
  const LineItem({required this.id, required this.name, required this.color});
  final String id;
  final String name;
  final Color color;
}

/// Grid of tappable line badges.
class LineGrid extends StatelessWidget {
  const LineGrid({super.key, required this.lines, required this.onTap});

  final List<LineItem> lines;
  final void Function(LineItem line) onTap;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 120,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1,
      ),
      itemCount: lines.length,
      itemBuilder: (context, index) {
        final line = lines[index];
        return Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => onTap(line),
            child: Center(
                child:
                    LineBadge(label: line.name, color: line.color, size: 52)),
          ),
        );
      },
    );
  }
}

/// A direction of travel ([sens]) and its terminus name.
class DirectionItem {
  const DirectionItem(this.sens, this.terminus);
  final int sens;
  final String terminus;
}

/// Two-way segmented control to pick the direction of travel.
class DirectionSelector extends StatelessWidget {
  const DirectionSelector({
    super.key,
    required this.directions,
    required this.selected,
    required this.onChanged,
    this.color,
  });

  final List<DirectionItem> directions;
  final int selected;
  final ValueChanged<int> onChanged;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final accent = color ?? scheme.primary;
    // The open-data API can return the same direction several times.
    final unique = <int, DirectionItem>{};
    for (final d in directions) {
      unique.putIfAbsent(d.sens, () => d);
    }
    if (unique.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: scheme.surfaceVariant.withOpacity(0.6),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            for (final d in unique.values)
              Expanded(
                child: _DirectionChip(
                  label: d.terminus,
                  selected: d.sens == selected,
                  accent: accent,
                  onTap: () => onChanged(d.sens),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _DirectionChip extends StatelessWidget {
  const _DirectionChip({
    required this.label,
    required this.selected,
    required this.accent,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = selected ? onColor(accent) : scheme.onSurfaceVariant;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? accent : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.arrow_forward_rounded, size: 16, color: fg),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: fg,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One stop of a line drawn as a node on a vertical route line.
class StopTile extends StatelessWidget {
  const StopTile({
    super.key,
    required this.name,
    required this.color,
    required this.isFirst,
    required this.isLast,
    required this.onTap,
  });

  final String name;
  final Color color;
  final bool isFirst;
  final bool isLast;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final terminus = isFirst || isLast;
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        height: 56,
        child: Row(
          children: [
            const SizedBox(width: 24),
            SizedBox(
              width: 24,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Column(
                    children: [
                      Expanded(
                        child: Container(
                            width: 4,
                            color: isFirst ? Colors.transparent : color),
                      ),
                      Expanded(
                        child: Container(
                            width: 4,
                            color: isLast ? Colors.transparent : color),
                      ),
                    ],
                  ),
                  Container(
                    width: terminus ? 20 : 14,
                    height: terminus ? 20 : 14,
                    decoration: BoxDecoration(
                      color: terminus ? color : scheme.surface,
                      shape: BoxShape.circle,
                      border: Border.all(color: color, width: 3.5),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: terminus ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: scheme.outline),
            const SizedBox(width: 12),
          ],
        ),
      ),
    );
  }
}

/// Live countdown card for the next passage at a stop. Re-renders itself
/// every 15 s so the minutes stay accurate without refetching data.
class ArrivalCard extends StatefulWidget {
  const ArrivalCard({
    super.key,
    required this.lineLabel,
    required this.lineColor,
    required this.stopName,
    required this.arrival,
    this.destination,
    this.extraArrivals = const [],
    this.updatedAt,
  });

  final String lineLabel;
  final Color lineColor;
  final String stopName;
  final DateTime arrival;
  final String? destination;
  final List<DateTime> extraArrivals;
  final DateTime? updatedAt;

  @override
  State<ArrivalCard> createState() => _ArrivalCardState();
}

class _ArrivalCardState extends State<ArrivalCard> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  String _countdown(AppLocalizations l10n, DateTime time) {
    final minutes = time.difference(DateTime.now()).inSeconds / 60;
    if (minutes < 1) return l10n.arrivingNow;
    return l10n.inMinutes(minutes.floor());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final color = widget.lineColor;
    final fg = onColor(color);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [color, Color.lerp(color, Colors.black, 0.25)!],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: fg.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        widget.lineLabel.toUpperCase(),
                        style: TextStyle(
                            color: fg,
                            fontWeight: FontWeight.w800,
                            fontSize: 16),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.stopName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            color: fg,
                            fontSize: 18,
                            fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  l10n.nextPassage.toUpperCase(),
                  style: TextStyle(
                    color: fg.withOpacity(0.8),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _countdown(l10n, widget.arrival),
                      style: TextStyle(
                        color: fg,
                        fontSize: 48,
                        height: 1,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        formatClock(widget.arrival),
                        style: TextStyle(
                            color: fg.withOpacity(0.85),
                            fontSize: 18,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                if (widget.destination != null &&
                    widget.destination!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.arrow_forward_rounded, color: fg, size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          l10n.towards(widget.destination!),
                          style: TextStyle(
                              color: fg,
                              fontSize: 15,
                              fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          for (final time in widget.extraArrivals)
            ListTile(
              leading: Icon(Icons.schedule_rounded, color: color),
              title: Text(formatClock(time)),
              trailing: Text(
                _countdown(l10n, time),
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
          if (widget.updatedAt != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: Row(
                children: [
                  Icon(Icons.sensors_rounded,
                      size: 16, color: theme.colorScheme.primary),
                  const SizedBox(width: 6),
                  Text(
                    l10n.updatedAt(formatClock(widget.updatedAt!)),
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Section title used above groups of cards.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 24, 4, 8),
      child: Text(
        text.toUpperCase(),
        style: theme.textTheme.labelMedium?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.1,
        ),
      ),
    );
  }
}

/// Turns a "m h * * d" cron expression into "HH:mm" (falls back to the raw
/// expression when it does not match that shape).
String describeCron(String cron) {
  final parts = cron.split(' ');
  if (parts.length < 2) return cron;
  final m = int.tryParse(parts[0]);
  final h = int.tryParse(parts[1]);
  if (m == null || h == null) return cron;
  return '${_two(h)}:${_two(m)}';
}

/// A saved alarm row with a delete action.
class AlarmTile extends StatelessWidget {
  const AlarmTile({
    super.key,
    required this.title,
    this.subtitle,
    required this.onDelete,
  });

  final String title;
  final String? subtitle;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: scheme.primaryContainer,
        foregroundColor: scheme.onPrimaryContainer,
        child: const Icon(Icons.alarm_rounded),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: subtitle == null ? null : Text(subtitle!),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline_rounded),
        color: scheme.error,
        onPressed: onDelete,
      ),
    );
  }
}
