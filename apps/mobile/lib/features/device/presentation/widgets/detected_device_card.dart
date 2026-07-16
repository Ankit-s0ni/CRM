import 'package:flutter/material.dart';
import '../../../../core/widgets/app_widgets.dart';

class DetectedDeviceCard extends StatelessWidget {
  const DetectedDeviceCard({super.key});
  @override
  Widget build(BuildContext context) => const AppCard(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.phone_android),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Pixel 7 • Android 15',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              SizedBox(height: 4),
              Text('ID 7A9C••••42F1'),
            ],
          ),
        ),
      ],
    ),
  );
}
