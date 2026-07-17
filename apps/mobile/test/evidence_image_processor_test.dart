import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/media/evidence_image_processor.dart';

void main() {
  test('returns compressed JPEG bytes within the upload bounds', () async {
    final expected = Uint8List(EvidenceImageProcessor.minBytes);
    final processor = EvidenceImageProcessor(compressor: (_) async => expected);

    expect(await processor.process('/tmp/capture.jpg'), same(expected));
  });

  test('rejects compressed evidence below the minimum size', () async {
    final processor = EvidenceImageProcessor(
      compressor: (_) async => Uint8List(EvidenceImageProcessor.minBytes - 1),
    );

    await expectLater(
      processor.process('/tmp/capture.jpg'),
      throwsA(isA<EvidenceImageException>()),
    );
  });

  test('rejects compressed evidence above the maximum size', () async {
    final processor = EvidenceImageProcessor(
      compressor: (_) async => Uint8List(EvidenceImageProcessor.maxBytes + 1),
    );

    await expectLater(
      processor.process('/tmp/capture.jpg'),
      throwsA(isA<EvidenceImageException>()),
    );
  });
}
