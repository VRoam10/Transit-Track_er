import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:transit_track_er/src/widgets/app_snackbar.dart';
import 'package:transit_track_er/src/pages/home_page.dart';
import 'package:transit_track_er/src/pages/register_page.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/pages/auth_layout.dart';

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
  bool _loading = false;

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

  Future<void> _signIn() async {
    final localizations = AppLocalizations.of(context)!;
    final navigator = Navigator.of(context);
    setState(() => _loading = true);
    try {
      final ok = await AuthService()
          .loginIsValid(_usernameController.text, _passwordController.text);
      if (!mounted) return;
      if (!ok) {
        AppSnackbar.showError(context, localizations.loginError);
        return;
      }
      AppSnackbar.showSuccess(context, localizations.loginSuccess);
      navigator.pushReplacementNamed(HomePage.routeName);
    } catch (e) {
      if (mounted) AppSnackbar.showError(context, e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return AuthLayout(
      title: localizations.appTitle,
      children: [
        TextField(
          controller: _usernameController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.username, AutofillHints.email],
          decoration: InputDecoration(
            labelText: localizations.username,
            prefixIcon: const Icon(Icons.person_outline_rounded),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _passwordController,
          obscureText: true,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.password],
          onSubmitted: (_) => _signIn(),
          decoration: InputDecoration(
            labelText: localizations.password,
            prefixIcon: const Icon(Icons.lock_outline_rounded),
          ),
        ),
        const SizedBox(height: 24),
        LoadingButton(
          label: localizations.connect,
          loading: _loading,
          onPressed: _signIn,
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () {
            Navigator.pushNamed(context, RegisterPage.routeName);
          },
          child: Text(localizations.register),
        ),
        const SizedBox(height: 8),
        TextButton.icon(
          onPressed: () {
            Navigator.pushNamed(context, HomePage.routeName);
          },
          icon: const Icon(Icons.arrow_forward_rounded),
          label: Text(localizations.guest),
        ),
      ],
    );
  }
}
