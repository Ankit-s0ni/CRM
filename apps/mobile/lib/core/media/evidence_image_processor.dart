import 'dart:typed_data';

import 'package:flutter_image_compress/flutter_image_compress.dart';

typedef EvidenceCompressor = Future<Uint8List?> Function(String filePath);

class EvidenceImageException implements Exception {
  const EvidenceImageException(this.message);

  final String message;

  @override
  String toString() => message;
}

class EvidenceImageProcessor {
  EvidenceImageProcessor({EvidenceCompressor? compressor})
    : _compressor = compressor ?? _compress;

  static const minBytes = 1024;
  static const maxBytes = 5000000;

  final EvidenceCompressor _compressor;

  Future<Uint8List> process(String filePath) async {
    final bytes = await _compressor(filePath);
    if (bytes == null || bytes.length < minBytes || bytes.length > maxBytes) {
      throw const EvidenceImageException(
        'Capture a clear JPEG photo between 1 KB and 5 MB and try again.',
      );
    }
    return bytes;
  }

  static Future<Uint8List?> _compress(String filePath) =>
      FlutterImageCompress.compressWithFile(
        filePath,
        minWidth: 1080,
        minHeight: 1080,
        quality: 80,
        format: CompressFormat.jpeg,
        keepExif: false,
      );
}
