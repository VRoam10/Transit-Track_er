import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:transit_track_er/src/widgets/app_snackbar.dart';
import 'package:transit_track_er/src/pages/home_page.dart';
import 'package:transit_track_er/src/service/auth_service.dart';
import 'package:transit_track_er/src/pages/auth_layout.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();

  static const routeName = '/register';
}

class _RegisterPageState extends State<RegisterPage> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
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
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final localizations = AppLocalizations.of(context)!;
    final navigator = Navigator.of(context);
    setState(() => _loading = true);
    try {
      await AuthService().register(_usernameController.text,
          _emailController.text, _passwordController.text);
    } catch (e) {
      if (mounted) AppSnackbar.showError(context, e.toString());
      if (mounted) setState(() => _loading = false);
      return;
    }
    if (!mounted) return;
    AppSnackbar.showSuccess(context, localizations.loginSuccess);
    navigator.pushReplacementNamed(HomePage.routeName);
  }

  @override
  Widget build(BuildContext context) {
    final localizations = AppLocalizations.of(context)!;

    return AuthLayout(
      title: localizations.createAccount,
      showBack: true,
      children: [
        TextField(
          controller: _usernameController,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.username],
          decoration: InputDecoration(
            labelText: localizations.username,
            prefixIcon: const Icon(Icons.person_outline_rounded),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.email],
          decoration: InputDecoration(
            labelText: localizations.email,
            prefixIcon: const Icon(Icons.alternate_email_rounded),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _passwordController,
          obscureText: true,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.newPassword],
          onSubmitted: (_) => _register(),
          decoration: InputDecoration(
            labelText: localizations.password,
            prefixIcon: const Icon(Icons.lock_outline_rounded),
          ),
        ),
        const SizedBox(height: 24),
        LoadingButton(
          label: localizations.createAccount,
          loading: _loading,
          onPressed: _register,
        ),
      ],
    );
  }
}
