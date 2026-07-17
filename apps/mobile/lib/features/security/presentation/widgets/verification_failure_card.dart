import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class VerificationFailureCard extends StatelessWidget {
  const VerificationFailureCard({
    super.key,
    required this.title,
    required this.code,
    required this.onRetry,
    this.details = const {},
    this.onRegularization,
  });
  final String title;
  final String code;
  final VoidCallback onRetry;
  final Map<String, dynamic> details;
  final VoidCallback? onRegularization;

  bool get _isFaceFailure => const {
    'FACE_MISMATCH',
    'LIVENESS_FAILED',
    'FACE_ATTEMPTS_EXCEEDED',
  }.contains(code);

  bool get _isLocationFailure => const {
    'OUTSIDE_GEOFENCE',
    'GPS_ACCURACY_TOO_LOW',
    'LOCATION_DISABLED',
    'LOCATION_PERMISSION_DENIED',
  }.contains(code);

  bool get _canRegularize =>
      details['regularizationAllowed'] == true || code == 'OUTSIDE_GEOFENCE';

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppTheme.danger.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(_icon, color: AppTheme.danger),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 6),
                  Text(
                    _guidance,
                    style: const TextStyle(color: AppTheme.slate),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (_isLocationFailure) ...[
          const SizedBox(height: 20),
          _LocationSummary(distanceMeters: details['distanceMeters']),
        ],
        if (_isFaceFailure) ...[const SizedBox(height: 20), const _FaceTips()],
        const SizedBox(height: 20),
        PrimaryButton(
          label: _retryLabel(context),
          icon: Icons.refresh_rounded,
          onPressed: onRetry,
        ),
        if (_canRegularize && onRegularization != null) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: onRegularization,
              child: const Text('Request regularization'),
            ),
          ),
        ],
        const SizedBox(height: 14),
        const Divider(),
        const SizedBox(height: 12),
        Text(
          'Error: $code',
          style: const TextStyle(
            color: AppTheme.slate,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    ),
  );

  IconData get _icon {
    if (_isFaceFailure) return Icons.face_retouching_off_rounded;
    if (code == 'MOCK_LOCATION') return Icons.gpp_bad_rounded;
    if (_isLocationFailure) return Icons.location_off_rounded;
    if (code.startsWith('DEVICE_') || code == 'ROOTED_DEVICE') {
      return Icons.phonelink_erase_rounded;
    }
    return Icons.warning_amber_rounded;
  }

  String get _guidance {
    if (_isFaceFailure) {
      return 'Use a clear, well-lit view of your face and keep the camera at eye level.';
    }
    if (code == 'MOCK_LOCATION') {
      return 'Turn off mock-location apps and developer location overrides before trying again.';
    }
    if (_isLocationFailure) {
      return 'Check location access and move within your approved attendance area.';
    }
    if (code.startsWith('DEVICE_') || code == 'ROOTED_DEVICE') {
      return 'This device does not meet the workspace security policy. Contact HR if the issue continues.';
    }
    if (code == 'VERIFICATION_PROVIDER_UNAVAILABLE') {
      return 'The verification service is temporarily unavailable. Your attendance has not been changed.';
    }
    return 'Review the guidance below and try the attendance check again.';
  }

  String _retryLabel(BuildContext context) {
    final remaining = details['attemptsRemaining'];
    if (_isFaceFailure && remaining is num) {
      return '${context.l10n.retry} (${remaining.toInt()} attempts left)';
    }
    return context.l10n.retry;
  }
}

class _LocationSummary extends StatelessWidget {
  const _LocationSummary({this.distanceMeters});

  final dynamic distanceMeters;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppTheme.canvas,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppTheme.line),
    ),
    child: Row(
      children: [
        const CircleAvatar(
          backgroundColor: Colors.white,
          child: Icon(Icons.my_location_rounded, color: AppTheme.danger),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            distanceMeters == null
                ? 'Your approved work location could not be confirmed.'
                : 'You are $distanceMeters m from the approved attendance zone.',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        const Icon(Icons.apartment_rounded, color: AppTheme.charcoal),
      ],
    ),
  );
}

class _FaceTips extends StatelessWidget {
  const _FaceTips();

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppTheme.canvas,
      borderRadius: BorderRadius.circular(14),
    ),
    child: const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tips for a better scan',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        SizedBox(height: 12),
        _Tip(
          icon: Icons.visibility_outlined,
          label: 'Remove masks, glasses or headwear',
        ),
        _Tip(
          icon: Icons.light_mode_outlined,
          label: 'Stand in a well-lit area',
        ),
        _Tip(
          icon: Icons.smartphone_rounded,
          label: 'Hold the camera at eye level',
        ),
      ],
    ),
  );
}

class _Tip extends StatelessWidget {
  const _Tip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.charcoal),
        const SizedBox(width: 10),
        Expanded(child: Text(label)),
      ],
    ),
  );
}
