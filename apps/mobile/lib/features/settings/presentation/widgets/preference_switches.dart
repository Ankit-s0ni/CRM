import 'package:flutter/material.dart';

import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class PreferenceSwitches extends StatefulWidget {
  const PreferenceSwitches({super.key});

  @override
  State<PreferenceSwitches> createState() => _PreferenceSwitchesState();
}

class _PreferenceSwitchesState extends State<PreferenceSwitches> {
  bool _checkInNudge = true;
  bool _checkOutReminder = true;

  void _change(String label, bool value, ValueSetter<bool> update) {
    setState(() => update(value));
    AppFeedback.success(context, '$label ${value ? 'enabled' : 'disabled'}.');
  }

  @override
  Widget build(BuildContext context) => AppCard(
    padding: EdgeInsets.zero,
    child: Column(
      children: [
        SwitchListTile(
          value: _checkInNudge,
          onChanged: (value) => _change(
            'Check-in reminder',
            value,
            (next) => _checkInNudge = next,
          ),
          title: Text(context.l10n.checkInReminder),
          subtitle: Text(context.l10n.notifyBeforeShift),
        ),
        const Divider(height: 1),
        SwitchListTile(
          value: _checkOutReminder,
          onChanged: (value) => _change(
            'Check-out reminder',
            value,
            (next) => _checkOutReminder = next,
          ),
          title: Text(context.l10n.checkOutReminder),
          subtitle: Text(context.l10n.notifyShiftEnd),
        ),
      ],
    ),
  );
}
