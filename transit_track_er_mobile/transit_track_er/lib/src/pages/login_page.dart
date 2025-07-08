import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:transit_track_er/src/pages/home_page.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

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
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    decoration: InputDecoration(
                      labelText: localizations.password,
                      border: const OutlineInputBorder(),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      if (!loginIsValid('username', 'password')) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(localizations.loginError)),
                        );
                        return;
                      }
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(localizations.loginSuccess)),
                      );
                      Navigator.pushNamed(
                          context,
                          HomePage.routeName // navigates to /home
                          );
                    },
                    child: Text(localizations.connect),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pushNamed(
                        context,
                        HomePage.routeName, // navigates to /home
                      );
                    },
                    child: Text(localizations.guest),
                  ),
                ],
              )),
        ));
  }
}

bool loginIsValid(String username, String password) {
  // Implement login validation logic here with server-side verification
  return false;
}
