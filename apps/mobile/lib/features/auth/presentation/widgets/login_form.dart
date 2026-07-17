import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({
    super.key,
    required this.onSubmit,
    required this.onForgotPassword,
    this.isLoading = false,
  });
  final Future<void> Function(String identifier, String password) onSubmit;
  final VoidCallback onForgotPassword;
  final bool isLoading;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(
    key: _formKey,
    child: Column(
      children: [
        TextFormField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.email, AutofillHints.username],
          validator: (value) => value == null || value.trim().isEmpty
              ? context.l10n.emailRequired
              : null,
          decoration: InputDecoration(
            labelText: context.l10n.workEmail,
            hintText: context.l10n.emailHint,
            prefixIcon: const Icon(Icons.mail_outline_rounded),
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          controller: _password,
          obscureText: _obscure,
          autofillHints: const [AutofillHints.password],
          validator: (value) => value == null || value.isEmpty
              ? context.l10n.passwordRequired
              : null,
          onFieldSubmitted: (_) => _submit(),
          decoration: InputDecoration(
            labelText: context.l10n.password,
            prefixIcon: const Icon(Icons.lock_outline_rounded),
            suffixIcon: IconButton(
              tooltip: _obscure ? 'Show password' : 'Hide password',
              onPressed: () => setState(() => _obscure = !_obscure),
              icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
            ),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: widget.onForgotPassword,
            child: Text(context.l10n.forgotPassword),
          ),
        ),
        PrimaryButton(
          label: widget.isLoading
              ? context.l10n.signingIn
              : context.l10n.signInSecurely,
          icon: widget.isLoading ? null : Icons.arrow_forward_rounded,
          onPressed: widget.isLoading ? null : _submit,
        ),
      ],
    ),
  );

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.onSubmit(_email.text.trim(), _password.text);
  }
}
