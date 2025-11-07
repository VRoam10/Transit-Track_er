import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:transit_track_er/src/pages/home_page.dart';
import 'package:transit_track_er/src/pages/register_page.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/settings/settings_view.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();

  static const routeName = '/';
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _checkAuthToken();
  }

  Future<void> _checkAuthToken() async {
    // Read stored token and navigate to home if present.
    final token = await storage.read(key: 'auth_token');
    if (token != null && token.isNotEmpty) {
      // Defer navigation until after the first frame to avoid nav during build/init
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          Navigator.pushReplacementNamed(context, HomePage.routeName);
        }
      });
    }
  }

  @override
  void dispose() {
    _passwordController.dispose(); // Always dispose controllers
    _usernameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return Scaffold(
        appBar: AppBar(
          title: Text(localizations.appTitle),
          actions: [
            IconButton(
              icon: const Icon(Icons.settings),
              onPressed: () {
                Navigator.restorablePushNamed(context, SettingsView.routeName);
              },
            ),
          ],
        ),
        body: Center(
          child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  TextField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                      labelText: localizations.username,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    decoration: InputDecoration(
                      labelText: localizations.password,
                      border: const OutlineInputBorder(),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () async {
                      try {
                        final token = await AuthService().loginIsValid(
                            _usernameController.text, _passwordController.text);
                        if (!mounted) return;
                        if (!token) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(localizations.loginError)),
                          );
                          return;
                        } else {
                          if (!mounted) return;

                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(localizations.loginSuccess)),
                          );
                          Navigator.pushReplacementNamed(
                              context, HomePage.routeName // navigates to /home
                              );
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(e.toString())),
                        );
                      }
                    },
                    child: Text(localizations.connect),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pushNamed(
                        context,
                        RegisterPage.routeName, // navigates to /home
                      );
                    },
                    child: Text(localizations.register),
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
