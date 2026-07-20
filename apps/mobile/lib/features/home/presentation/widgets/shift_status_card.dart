import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class ShiftStatusCard extends StatelessWidget {
  const ShiftStatusCard({
    super.key,
    required this.shiftLabel,
    required this.locationLabel,
    required this.isInsideZone,
  });
  final String shiftLabel;
  final String locationLabel;
  final bool? isInsideZone;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: AppTheme.charcoal,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Icon(
                Icons.schedule_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.green,
                borderRadius: BorderRadius.circular(30),
              ),
              child: const Text(
                'ON SCHEDULE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .4,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'TODAY’S SHIFT',
          style: TextStyle(
            color: Colors.white60,
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          shiftLabel,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Icon(
              isInsideZone == true
                  ? Icons.near_me_rounded
                  : isInsideZone == false
                  ? Icons.location_off_outlined
                  : Icons.location_on_outlined,
              color: Colors.white70,
              size: 17,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                locationLabel,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}
