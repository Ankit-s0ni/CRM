import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';

class DetectedDeviceCard extends StatelessWidget {
  const DetectedDeviceCard({super.key, this.device});

  final Map<String, dynamic>? device;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.phone_android),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _description,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(_identifier),
            ],
          ),
        ),
      ],
    ),
  );

  String get _description {
    final model = device?['deviceModel'] as String? ?? 'This device';
    final platform = device?['platform'] as String?;
    final osVersion = device?['osVersion'] as String?;
    final details = [platform, osVersion].whereType<String>().join(' ');
    return details.isEmpty ? model : '$model • $details';
  }

  String get _identifier {
    final id = device?['deviceUuid'] as String?;
    if (id == null || id.length < 8) return 'Secure device identity detected';
    return 'ID ${id.substring(0, 4)}••••${id.substring(id.length - 4)}';
  }
}
