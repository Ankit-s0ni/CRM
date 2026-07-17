import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../l10n/l10n_context.dart';

enum FaceCaptureStatus {
  preparing,
  permissionRequired,
  ready,
  capturing,
  failed,
}

class FaceCaptureGuide extends StatefulWidget {
  const FaceCaptureGuide({
    super.key,
    required this.onCaptured,
    this.isCheckOut = false,
    this.captureLabel,
  });
  final Future<void> Function(XFile file) onCaptured;
  final bool isCheckOut;
  final String? captureLabel;

  @override
  State<FaceCaptureGuide> createState() => _FaceCaptureGuideState();
}

class _FaceCaptureGuideState extends State<FaceCaptureGuide>
    with WidgetsBindingObserver {
  CameraController? _camera;
  FaceCaptureStatus _status = FaceCaptureStatus.preparing;
  String _message = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _prepareCamera();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) {
      _disposeCamera();
    } else if (state == AppLifecycleState.resumed && _camera == null) {
      _prepareCamera();
    }
  }

  Future<void> _prepareCamera() async {
    if (!mounted) return;
    setState(() {
      _status = FaceCaptureStatus.preparing;
      _message = '';
    });
    try {
      if (!kIsWeb) {
        final permission = await Permission.camera.request();
        if (!permission.isGranted) {
          if (!mounted) return;
          setState(() {
            _status = FaceCaptureStatus.permissionRequired;
            _message = context.l10n.cameraRequired;
          });
          return;
        }
      }
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw CameraException('no-camera', 'No camera found');
      }
      final selected = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        selected,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _camera = controller;
        _status = FaceCaptureStatus.ready;
        _message = context.l10n.centreFace;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _status = FaceCaptureStatus.failed;
        _message = context.l10n.cameraUnavailable;
      });
    }
  }

  Future<void> _capture() async {
    final camera = _camera;
    if (camera == null ||
        !camera.value.isInitialized ||
        _status == FaceCaptureStatus.capturing) {
      return;
    }
    setState(() {
      _status = FaceCaptureStatus.capturing;
      _message = context.l10n.verifyingFaceLocation;
    });
    try {
      final file = await camera.takePicture();
      await widget.onCaptured(file);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _status = FaceCaptureStatus.failed;
        _message = context.l10n.captureFailed;
      });
    }
  }

  Future<void> _disposeCamera() async {
    final camera = _camera;
    _camera = null;
    await camera?.dispose();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeCamera();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Expanded(
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.fromLTRB(20, 8, 20, 18),
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: const Color(0xFF111418),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white12),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (_camera?.value.isInitialized ?? false)
                CameraPreview(_camera!)
              else
                const Center(
                  child: Icon(
                    Icons.face_retouching_natural_rounded,
                    color: Colors.white24,
                    size: 88,
                  ),
                ),
              Center(
                child: Container(
                  width: 210,
                  height: 280,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _status == FaceCaptureStatus.ready
                          ? Colors.white
                          : Colors.white54,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(120),
                  ),
                ),
              ),
              Positioned(
                top: 16,
                left: 16,
                child: _SecurityBadge(
                  active: _status == FaceCaptureStatus.ready,
                ),
              ),
              if (_status == FaceCaptureStatus.preparing ||
                  _status == FaceCaptureStatus.capturing)
                const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
            ],
          ),
        ),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Text(
          _message.isEmpty ? context.l10n.preparingCamera : _message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      const SizedBox(height: 8),
      Text(
        context.l10n.verificationEvidence,
        style: const TextStyle(color: Colors.white54, fontSize: 11),
      ),
      Padding(
        padding: const EdgeInsets.all(20),
        child: SizedBox(
          width: double.infinity,
          height: 54,
          child: FilledButton.icon(
            onPressed: switch (_status) {
              FaceCaptureStatus.ready => _capture,
              FaceCaptureStatus.permissionRequired ||
              FaceCaptureStatus.failed => _prepareCamera,
              _ => null,
            },
            icon: Icon(
              _status == FaceCaptureStatus.ready
                  ? Icons.camera_alt_rounded
                  : Icons.refresh_rounded,
            ),
            label: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                _status == FaceCaptureStatus.ready
                    ? widget.captureLabel ??
                          (widget.isCheckOut
                              ? context.l10n.verifyCheckOut
                              : context.l10n.verifyCheckIn)
                    : context.l10n.tryCameraAgain,
              ),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppTheme.charcoal,
            ),
          ),
        ),
      ),
    ],
  );
}

class _SecurityBadge extends StatelessWidget {
  const _SecurityBadge({required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
    decoration: BoxDecoration(
      color: Colors.black54,
      borderRadius: BorderRadius.circular(30),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          active ? Icons.lock_rounded : Icons.hourglass_top_rounded,
          color: Colors.white,
          size: 13,
        ),
        const SizedBox(width: 6),
        Text(
          active ? context.l10n.secureCapture : context.l10n.initialising,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: .5,
          ),
        ),
      ],
    ),
  );
}
