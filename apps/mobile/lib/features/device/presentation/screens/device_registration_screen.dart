import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../widgets/detected_device_card.dart';
import '../../../../l10n/l10n_context.dart';

class DeviceRegistrationScreen extends StatelessWidget {
  const DeviceRegistrationScreen({super.key, required this.onRegister});
  final VoidCallback onRegister;
  @override
  Widget build(BuildContext context) => AppPage(
    title: context.l10n.registerDevice,
    child: Column(
      children: [
        const Icon(Icons.shield_outlined, size: 72),
        const SizedBox(height: 20),
        Text(context.l10n.devicePolicy, textAlign: TextAlign.center),
        const SizedBox(height: 20),
        const DetectedDeviceCard(),
        const SizedBox(height: 24),
        PrimaryButton(
          label: context.l10n.registerDeviceAction,
          onPressed: onRegister,
        ),
      ],
    ),
  );
}
