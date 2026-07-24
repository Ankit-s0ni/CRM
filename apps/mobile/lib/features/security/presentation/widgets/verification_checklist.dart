import 'package:flutter/material.dart';

class VerificationChecklist extends StatelessWidget {
  const VerificationChecklist({
    super.key,
    required this.integrityRequired,
    required this.locationRequired,
    required this.faceRequired,
  });

  final bool integrityRequired;
  final bool locationRequired;
  final bool faceRequired;

  @override
  Widget build(BuildContext context) {
    final labels = [
      'Device',
      if (integrityRequired) 'Security check',
      if (locationRequired) 'Location',
      if (faceRequired) 'Face match',
    ];
    return Column(
      children: [
        for (var index = 0; index < labels.length; index++)
          _CheckRow(label: labels[index], complete: index < labels.length - 1),
      ],
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.label, required this.complete});
  final String label;
  final bool complete;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: complete
        ? const Icon(Icons.check_circle, color: Colors.green)
        : const SizedBox.square(
            dimension: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
    title: Text(label),
  );
}
