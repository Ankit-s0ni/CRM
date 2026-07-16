import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

class TrackingMapCard extends StatelessWidget {
  const TrackingMapCard({super.key, required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(10),
    child: Column(
      children: [
        Container(
          height: 230,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: const Color(0xFFF0F1ED),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Stack(
            children: [
              const Positioned(
                left: -20,
                top: 35,
                right: -20,
                child: Divider(color: Colors.white, thickness: 18),
              ),
              const Positioned(
                left: 120,
                top: -20,
                bottom: -20,
                child: VerticalDivider(color: Colors.white, thickness: 14),
              ),
              const Positioned(
                left: 25,
                top: 18,
                child: _MapLabel(label: 'Al Khuwair'),
              ),
              const Positioned(
                right: 22,
                bottom: 26,
                child: _MapLabel(label: 'Madinat Qaboos'),
              ),
              CustomPaint(
                size: const Size(double.infinity, 230),
                painter: _RoutePainter(active: active),
              ),
              Positioned(left: 76, bottom: 46, child: _MapPin(active: active)),
              Positioned(
                right: 14,
                top: 14,
                child: Column(
                  children: [
                    const _MapControl(icon: Icons.add),
                    const SizedBox(height: 6),
                    const _MapControl(icon: Icons.remove),
                    const SizedBox(height: 6),
                    _MapControl(
                      icon: Icons.my_location_rounded,
                      active: active,
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 12,
                bottom: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    active ? 'GPS ±8 m · updated now' : 'Location paused',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MapMetric(value: '21.6 km', label: context.l10n.distance),
            ),
            Expanded(
              child: _MapMetric(value: '34', label: context.l10n.pings),
            ),
            Expanded(
              child: _MapMetric(value: '2', label: context.l10n.stops),
            ),
          ],
        ),
      ],
    ),
  );
}

class _RoutePainter extends CustomPainter {
  const _RoutePainter({required this.active});
  final bool active;
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = active ? AppTheme.green : AppTheme.slate.withValues(alpha: .4)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final path = Path()
      ..moveTo(82, size.height - 54)
      ..cubicTo(104, 148, 84, 112, 142, 90)
      ..cubicTo(185, 72, 205, 105, size.width - 54, 64);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _RoutePainter oldDelegate) =>
      oldDelegate.active != active;
}

class _MapPin extends StatelessWidget {
  const _MapPin({required this.active});
  final bool active;
  @override
  Widget build(BuildContext context) => Container(
    width: 30,
    height: 30,
    decoration: BoxDecoration(
      color: active ? AppTheme.green : AppTheme.slate,
      shape: BoxShape.circle,
      border: Border.all(color: Colors.white, width: 4),
    ),
    child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 13),
  );
}

class _MapControl extends StatelessWidget {
  const _MapControl({required this.icon, this.active = false});
  final IconData icon;
  final bool active;
  @override
  Widget build(BuildContext context) => Container(
    width: 34,
    height: 34,
    decoration: BoxDecoration(
      color: active ? AppTheme.charcoal : Colors.white,
      borderRadius: BorderRadius.circular(9),
    ),
    child: Icon(
      icon,
      size: 17,
      color: active ? Colors.white : AppTheme.charcoal,
    ),
  );
}

class _MapLabel extends StatelessWidget {
  const _MapLabel({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Text(
    label,
    style: const TextStyle(
      color: AppTheme.slate,
      fontSize: 10,
      fontWeight: FontWeight.w600,
    ),
  );
}

class _MapMetric extends StatelessWidget {
  const _MapMetric({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(
        value,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(color: AppTheme.slate, fontSize: 10)),
    ],
  );
}
