import 'package:flutter/material.dart';

class EnrollmentFaceGuide extends StatelessWidget {
  const EnrollmentFaceGuide({super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Center your face, blink slowly, and hold still',
    child: Container(
      width: 240,
      height: 320,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.white, width: 3),
        borderRadius: BorderRadius.circular(130),
      ),
      child: const Icon(Icons.face, size: 72, color: Colors.white),
    ),
  );
}
