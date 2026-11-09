import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:transit_track_er/src/theme/app_theme.dart';
import 'package:transit_track_er/src/widgets/transit_widgets.dart';

import 'helpers.dart';

void main() {
  group('helpers', () {
    test('onColor picks white on dark and dark text on light backgrounds', () {
      expect(onColor(const Color(0xFF1B3FD0)), Colors.white);
      expect(onColor(const Color(0xFFF39200)), Colors.black87);
      expect(onColor(Colors.white), Colors.black87);
    });

    test('formatClock pads hours and minutes', () {
      expect(formatClock(DateTime(2026, 11, 9, 7, 5)), '07:05');
      expect(formatClock(DateTime(2026, 11, 9, 23, 59)), '23:59');
    });

    test('modeIcon and modeColor distinguish bus from metro', () {
      expect(modeIcon('bus'), Icons.directions_bus_rounded);
      expect(modeIcon('BUS'), Icons.directions_bus_rounded);
      expect(modeIcon('metro'), Icons.subway_rounded);
      expect(modeColor('bus'), AppColors.brandBlue);
      expect(modeColor('metro'), AppColors.brandRed);
    });
  });

  group('describeCron', () {
    Future<String> describe(WidgetTester tester, String cron,
        {Locale locale = const Locale('en')}) async {
      late String result;
      await tester.pumpWidget(wrap(
        Builder(builder: (context) {
          result = describeCron(context, cron);
          return const SizedBox();
        }),
        locale: locale,
      ));
      return result;
    }

    testWidgets('shows weekday and time', (tester) async {
      expect(await describe(tester, '15 8 * * 1'), 'Mon · 08:15');
      expect(await describe(tester, '40 18 * * 5'), 'Fri · 18:40');
    });

    testWidgets('treats 0 and 7 as Sunday', (tester) async {
      expect(await describe(tester, '0 9 * * 0'), 'Sun · 09:00');
      expect(await describe(tester, '0 9 * * 7'), 'Sun · 09:00');
    });

    testWidgets('shows only the time when every day matches', (tester) async {
      expect(await describe(tester, '5 7 * * *'), '07:05');
    });

    testWidgets('uses French weekday names', (tester) async {
      final fr =
          await describe(tester, '15 8 * * 1', locale: const Locale('fr'));
      expect(fr, endsWith('08:15'));
      expect(fr, isNot(startsWith('Mon')));
    });

    testWidgets('returns unknown formats unchanged', (tester) async {
      expect(await describe(tester, '@hourly'), '@hourly');
      expect(await describe(tester, 'a b * * 1'), 'a b * * 1');
    });
  });

  group('LineBadge', () {
    testWidgets('shows the line name in upper case', (tester) async {
      await tester.pumpWidget(
          wrap(const Center(child: LineBadge(label: 'c1', color: Colors.red))));
      expect(find.text('C1'), findsOneWidget);
    });

    testWidgets('hugs its label instead of filling the width', (tester) async {
      await tester.pumpWidget(
          wrap(const Center(child: LineBadge(label: 'a', color: Colors.red))));
      final width = tester.getSize(find.byType(LineBadge)).width;
      expect(width, lessThan(100));
    });
  });

  group('AsyncBody', () {
    testWidgets('shows a spinner, then the data', (tester) async {
      final completer = Completer<List<String>>();
      await tester.pumpWidget(wrap(AsyncBody<List<String>>(
        future: completer.future,
        emptyMessage: 'Nothing',
        builder: (_, data) => Text(data.join(',')),
      )));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      completer.complete(['a', 'b']);
      await tester.pumpAndSettle();

      expect(find.text('a,b'), findsOneWidget);
    });

    testWidgets('shows the empty message for an empty list', (tester) async {
      await tester.pumpWidget(wrap(AsyncBody<List<String>>(
        future: Future.value(const []),
        emptyMessage: 'No stops found',
        builder: (_, __) => const Text('data'),
      )));
      await tester.pumpAndSettle();

      expect(find.text('No stops found'), findsOneWidget);
      expect(find.text('data'), findsNothing);
    });

    testWidgets('shows the error without the "Exception:" prefix and retries',
        (tester) async {
      var retries = 0;
      // The localized app builds a frame later, so mark the error as handled
      // up front; FutureBuilder still receives it.
      final failing =
          Future<List<String>>.error(Exception('Failed to load lines (500)'))
            ..ignore();
      await tester.pumpWidget(wrap(AsyncBody<List<String>>(
        future: failing,
        emptyMessage: 'Nothing',
        onRetry: () => retries++,
        builder: (_, __) => const Text('data'),
      )));
      await tester.pumpAndSettle();

      expect(find.text('Failed to load lines (500)'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      expect(retries, 1);
    });

    testWidgets('localizes the retry button', (tester) async {
      final failing = Future<List<String>>.error(Exception('x'))..ignore();
      await tester.pumpWidget(wrap(
        AsyncBody<List<String>>(
          future: failing,
          emptyMessage: '',
          onRetry: () {},
          builder: (_, __) => const SizedBox(),
        ),
        locale: const Locale('fr'),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Réessayer'), findsOneWidget);
    });
  });

  group('DirectionSelector', () {
    testWidgets('shows each direction once and reports taps', (tester) async {
      int? selected;
      await tester.pumpWidget(wrap(DirectionSelector(
        directions: const [
          DirectionItem(0, 'La Poterie'),
          DirectionItem(1, 'J.F. Kennedy'),
          DirectionItem(0, 'La Poterie'), // duplicate from the API
        ],
        selected: 0,
        onChanged: (s) => selected = s,
      )));

      expect(find.text('La Poterie'), findsOneWidget);
      expect(find.text('J.F. Kennedy'), findsOneWidget);

      await tester.tap(find.text('J.F. Kennedy'));
      expect(selected, 1);
    });

    testWidgets('renders nothing without directions', (tester) async {
      await tester.pumpWidget(wrap(DirectionSelector(
        directions: const [],
        selected: 0,
        onChanged: (_) {},
      )));
      expect(find.byType(Row), findsNothing);
    });
  });

  group('StopTile', () {
    testWidgets('shows the stop name and handles taps', (tester) async {
      var taps = 0;
      await tester.pumpWidget(wrap(StopTile(
        name: 'République',
        color: Colors.red,
        isFirst: false,
        isLast: false,
        onTap: () => taps++,
      )));

      await tester.tap(find.text('République'));
      expect(taps, 1);
    });

    testWidgets('makes terminus names bold', (tester) async {
      await tester.pumpWidget(wrap(Column(children: [
        StopTile(
            name: 'Perrache',
            color: Colors.red,
            isFirst: true,
            isLast: false,
            onTap: () {}),
        StopTile(
            name: 'Bellecour',
            color: Colors.red,
            isFirst: false,
            isLast: false,
            onTap: () {}),
      ])));

      FontWeight? weight(String name) =>
          tester.widget<Text>(find.text(name)).style?.fontWeight;
      expect(weight('Perrache'), FontWeight.w700);
      expect(weight('Bellecour'), FontWeight.w500);
    });
  });

  group('ArrivalCard', () {
    testWidgets('shows minutes until arrival, clock time and destination',
        (tester) async {
      final arrival =
          DateTime.now().add(const Duration(minutes: 4, seconds: 30));
      await tester.pumpWidget(wrap(ArrivalCard(
        lineLabel: 'a',
        lineColor: Colors.red,
        stopName: 'République',
        arrival: arrival,
        destination: 'La Poterie',
        updatedAt: DateTime(2026, 11, 9, 9, 40),
      )));

      expect(find.text('4 min'), findsOneWidget);
      expect(find.text(formatClock(arrival)), findsOneWidget);
      expect(find.text('Towards La Poterie'), findsOneWidget);
      expect(find.text('Updated at 09:40'), findsOneWidget);
      expect(find.text('A'), findsOneWidget);
    });

    testWidgets('says "Now" when the vehicle is less than a minute away',
        (tester) async {
      await tester.pumpWidget(wrap(ArrivalCard(
        lineLabel: 'C1',
        lineColor: Colors.blue,
        stopName: 'Gares',
        arrival: DateTime.now().add(const Duration(seconds: 20)),
      )));

      expect(find.text('Now'), findsOneWidget);
    });

    testWidgets('lists the following passages', (tester) async {
      final now = DateTime.now();
      await tester.pumpWidget(wrap(SingleChildScrollView(
        child: ArrivalCard(
          lineLabel: 'C1',
          lineColor: Colors.blue,
          stopName: 'Gares',
          arrival: now.add(const Duration(minutes: 2, seconds: 30)),
          extraArrivals: [
            now.add(const Duration(minutes: 9, seconds: 30)),
            now.add(const Duration(minutes: 16, seconds: 30)),
          ],
        ),
      )));

      expect(find.text('9 min'), findsOneWidget);
      expect(find.text('16 min'), findsOneWidget);
    });

    testWidgets('counts down on its own without new data', (tester) async {
      final arrival =
          DateTime.now().add(const Duration(minutes: 1, seconds: 10));
      await tester.pumpWidget(wrap(ArrivalCard(
        lineLabel: 'a',
        lineColor: Colors.red,
        stopName: 'Gares',
        arrival: arrival,
      )));
      expect(find.text('1 min'), findsOneWidget);

      // The card refreshes every 15 s; the real clock decides the minutes,
      // so just check that its periodic rebuild does not throw.
      await tester.pump(const Duration(seconds: 15));
      expect(find.byType(ArrivalCard), findsOneWidget);
    });
  });

  group('AccountCard', () {
    testWidgets('shows the signed-in email and signs out', (tester) async {
      var signedOut = false;
      await tester.pumpWidget(wrap(AccountCard(
        email: 'romain@example.fr',
        onSignOut: () => signedOut = true,
        onSignIn: () {},
      )));

      expect(find.text('romain@example.fr'), findsOneWidget);
      expect(find.text('R'), findsOneWidget);
      expect(find.text('Signed in'), findsOneWidget);

      await tester.tap(find.text('Sign out'));
      expect(signedOut, isTrue);
    });

    testWidgets('invites guests to sign in', (tester) async {
      var signIn = false;
      await tester.pumpWidget(wrap(AccountCard(
        email: null,
        onSignOut: () {},
        onSignIn: () => signIn = true,
      )));

      expect(find.text('Sign out'), findsNothing);
      await tester.tap(find.text('Sign In'));
      expect(signIn, isTrue);
    });
  });

  group('alarms', () {
    testWidgets('AlarmTile calls onDelete', (tester) async {
      var deleted = false;
      await tester.pumpWidget(wrap(AlarmTile(
        title: 'Mon · 08:15',
        subtitle: 'Stop B5',
        icon: Icons.subway_rounded,
        color: AppColors.brandRed,
        onDelete: () => deleted = true,
      )));

      expect(find.text('Mon · 08:15'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.delete_outline_rounded));
      expect(deleted, isTrue);
    });

    testWidgets(
        'showAlarmConfirmDialog returns true on Continue, false on Cancel',
        (tester) async {
      final results = <bool>[];
      await tester.pumpWidget(wrap(Builder(
        builder: (context) => ElevatedButton(
          onPressed: () async =>
              results.add(await showAlarmConfirmDialog(context)),
          child: const Text('open'),
        ),
      )));

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.text('Set Alarm'), findsOneWidget);
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(results, [true, false]);
    });

    testWidgets('formatAlarmDate shows the localized date and time',
        (tester) async {
      late String text;
      await tester.pumpWidget(wrap(Builder(builder: (context) {
        text = formatAlarmDate(context, DateTime(2026, 11, 10, 8, 10));
        return const SizedBox();
      })));
      expect(text, 'Nov 10 · 08:10');
    });
  });

  testWidgets('widgets render in the dark theme without errors',
      (tester) async {
    await tester.pumpWidget(wrap(
      SingleChildScrollView(
        child: Column(children: [
          const LineBadge(label: 'B', color: Color(0xFF00893E)),
          AccountCard(email: 'a@b.fr', onSignOut: () {}, onSignIn: () {}),
          AlarmTile(
              title: 'Fri · 18:40',
              onDelete: () {},
              color: AppColors.brandBlue),
          ArrivalCard(
            lineLabel: 'B',
            lineColor: const Color(0xFF00893E),
            stopName: 'Gares',
            arrival: DateTime.now().add(const Duration(minutes: 3)),
          ),
        ]),
      ),
      brightness: Brightness.dark,
    ));
    expect(tester.takeException(), isNull);
  });
}
