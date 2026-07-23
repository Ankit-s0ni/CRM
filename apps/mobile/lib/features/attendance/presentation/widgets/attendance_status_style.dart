import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

Color attendanceStatusColor(String status) => switch (status) {
  'PRESENT' || 'PRESENT_OPEN' => AppTheme.green,
  'LATE' || 'HALF_DAY' => const Color(0xFFD97706),
  'ABSENT' => AppTheme.danger,
  'ON_LEAVE' => const Color(0xFF315B8A),
  'HOLIDAY' => const Color(0xFF7C3AED),
  'WEEKLY_OFF' => const Color(0xFF64748B),
  'ON_DUTY' => const Color(0xFF0F766E),
  'WORKING_DAY' => const Color(0xFF2563EB),
  'UPCOMING' => const Color(0xFF94A3B8),
  _ => const Color(0xFFCBD5E1),
};

String attendanceStatusLabel(String status) => switch (status) {
  'PRESENT' => 'Present',
  'PRESENT_OPEN' => 'Checked in',
  'LATE' => 'Late',
  'HALF_DAY' => 'Half day',
  'ABSENT' => 'Absent',
  'ON_LEAVE' => 'Leave',
  'HOLIDAY' => 'Holiday',
  'WEEKLY_OFF' => 'Weekly off',
  'ON_DUTY' => 'On duty',
  'WORKING_DAY' => 'Working day',
  'UPCOMING' => 'Upcoming',
  'NOT_APPLICABLE' => 'Not applicable',
  _ => status.replaceAll('_', ' ').toLowerCase(),
};
