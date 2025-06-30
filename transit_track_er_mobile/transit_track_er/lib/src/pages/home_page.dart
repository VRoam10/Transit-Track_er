import 'package:flutter/material.dart';
import 'package:transit_track_er/src/sample_feature/sample_item_list_view.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const routeName = '/';
  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
        appBar: AppBar(title: Text(localizations.appTitle)),
        body: Center(
          child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextField(
                    decoration: InputDecoration(
                      labelText: localizations.username,
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    decoration: InputDecoration(
                      labelText: localizations.password,
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Handle login logic here
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(localizations.loginSuccess)),
                      );
                      Navigator.pushNamed(
                          context,
                          SampleItemListView.routeName // navigates to /sample_list
                          );
                    },
                    child: Text(localizations.connect),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pushNamed(
                        context,
                        SampleItemListView
                            .routeName, // navigates to /sample_list
                      );
                    },
                    child: Text(localizations.guest),
                  ),
                ],
              )),
        ));
  }
}
