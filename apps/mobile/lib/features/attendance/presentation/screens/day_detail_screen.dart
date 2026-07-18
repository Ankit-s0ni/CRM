import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';
import '../attendance_controller.dart';

class DayDetailScreen extends ConsumerWidget {
  const DayDetailScreen({
    super.key,
    required this.date,
    required this.onCorrection,
  });
  final String date;
  final void Function(String attendanceLogId, String date) onCorrection;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final day = ref.watch(attendanceDayProvider(date));
    final data = day.asData?.value;
    final parsed = DateTime.tryParse(date) ?? DateTime.now();
    final totals = data?['totals'] as Map<String, dynamic>? ?? {};
    final timeline = (data?['timeline'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList(growable: false);
    return AppPage(
      title:
          '${DateFormat.MMMd(Localizations.localeOf(context).languageCode).format(parsed)} · ${context.l10n.dayDetail}',
      back: true,
      child: Column(
        children: [
          if (day.isLoading) const LinearProgressIndicator(),
          AppCard(
            child: Wrap(
              alignment: WrapAlignment.spaceAround,
              spacing: 18,
              runSpacing: 14,
              children: [
                _Metric(label: 'Status', value: '${data?['status'] ?? '—'}'),
                _Metric(
                  label: 'Worked',
                  value: _duration(totals['workMinutes']),
                ),
                _Metric(
                  label: 'Break',
                  value: _duration(totals['breakMinutes']),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Timeline',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                if (timeline.isEmpty)
                  const Text('No attendance events recorded for this day.'),
                for (final event in timeline)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.check_circle_outline),
                    title: Text('${event['eventType']}'),
                    subtitle: Text(_eventTime(event['eventTime'])),
                    trailing: Text('${event['source'] ?? ''}'),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          AppCard(
            child: Row(
              children: [
                Icon(
                  data?['isLocked'] == true
                      ? Icons.lock_outline_rounded
                      : Icons.lock_open_rounded,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    data?['isLocked'] == true
                        ? 'Payroll status: Locked'
                        : 'Payroll status: Open',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          PrimaryButton(
            label: context.l10n.requestCorrection,
            onPressed: data?['isLocked'] == true || data?['id'] is! String
                ? null
                : () => onCorrection(data!['id'] as String, date),
          ),
          if (day.hasError)
            const Text('This attendance day could not be loaded.'),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      Text(label, style: const TextStyle(fontSize: 11)),
    ],
  );
}

String _duration(Object? raw) {
  final minutes = (raw as num?)?.round() ?? 0;
  return '${minutes ~/ 60}h ${minutes % 60}m';
}

String _eventTime(Object? raw) {
  final value = raw is String ? DateTime.tryParse(raw)?.toLocal() : null;
  return value == null ? 'Time unavailable' : DateFormat.jm().format(value);
}
