import 'package:flutter/material.dart';

class VerificationChecklist extends StatelessWidget {
  const VerificationChecklist({super.key});

  @override
  Widget build(BuildContext context) => const Column(
    children: [
      _CheckRow(label: 'Device', complete: true),
      _CheckRow(label: 'Security check', complete: true),
      _CheckRow(label: 'Location', complete: true),
      _CheckRow(label: 'Face match', complete: false),
    ],
  );
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
