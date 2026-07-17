import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../widgets/face_capture_guide.dart';
import '../../../../l10n/l10n_context.dart';

class PunchCameraScreen extends StatelessWidget {
  const PunchCameraScreen({
    super.key,
    required this.onCaptured,
    this.isCheckOut = false,
  });
  final Future<void> Function(XFile file) onCaptured;
  final bool isCheckOut;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppTheme.charcoal,
    appBar: AppBar(
      backgroundColor: AppTheme.charcoal,
      foregroundColor: Colors.white,
      title: Text(
        isCheckOut ? context.l10n.cameraCheckOut : context.l10n.cameraCheckIn,
      ),
    ),
    body: SafeArea(
      child: Column(
        children: [
          Expanded(
            child: FaceCaptureGuide(
              isCheckOut: isCheckOut,
              onCaptured: onCaptured,
            ),
          ),
        ],
      ),
    ),
  );
}
