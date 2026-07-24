import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_routes.dart';
import '../../../../core/network/network_providers.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key, required this.onChanged});

  final Future<void> Function() onChanged;

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;
  bool _obscure = true;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AppPage(
    title: 'Change password',
    back: true,
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Use at least 8 characters. You will sign in again after the password is changed.',
            style: TextStyle(height: 1.5),
          ),
          const SizedBox(height: 20),
          _passwordField(
            controller: _current,
            label: 'Current password',
            validator: _requiredPassword,
          ),
          const SizedBox(height: 14),
          _passwordField(
            controller: _next,
            label: 'New password',
            validator: (value) {
              final required = _requiredPassword(value);
              if (required != null) return required;
              if (value == _current.text) {
                return 'Choose a password different from the current one.';
              }
              return null;
            },
          ),
          const SizedBox(height: 14),
          _passwordField(
            controller: _confirm,
            label: 'Confirm new password',
            validator: (value) => value != _next.text
                ? 'The password confirmation does not match.'
                : null,
          ),
          const SizedBox(height: 22),
          PrimaryButton(
            label: _saving ? 'Changing password...' : 'Change password',
            icon: Icons.lock_reset_rounded,
            onPressed: _saving ? null : _submit,
          ),
        ],
      ),
    ),
  );

  Widget _passwordField({
    required TextEditingController controller,
    required String label,
    required String? Function(String?) validator,
  }) => TextFormField(
    controller: controller,
    obscureText: _obscure,
    autofillHints: const [AutofillHints.password],
    decoration: InputDecoration(
      labelText: label,
      suffixIcon: IconButton(
        tooltip: _obscure ? 'Show password' : 'Hide password',
        onPressed: () => setState(() => _obscure = !_obscure),
        icon: Icon(
          _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
        ),
      ),
    ),
    validator: validator,
  );

  String? _requiredPassword(String? value) {
    if (value == null || value.length < 8) {
      return 'Enter at least 8 characters.';
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiServiceProvider)
          .post(
            ApiRoutes.changePassword,
            data: {'currentPassword': _current.text, 'newPassword': _next.text},
          );
      if (!mounted) return;
      AppFeedback.success(context, 'Password changed successfully.');
      await widget.onChanged();
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map<String, dynamic>
          ? body['message'] as String?
          : null;
      AppFeedback.error(
        context,
        message ?? 'The password could not be changed.',
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
