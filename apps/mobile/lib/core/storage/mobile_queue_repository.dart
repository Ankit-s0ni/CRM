export 'mobile_queue_repository_native.dart'
    if (dart.library.js_interop) 'mobile_queue_repository_web.dart';

Duration queueBackoff(int attempts) {
  final seconds = 15 * (1 << attempts.clamp(0, 8));
  return Duration(seconds: seconds.clamp(15, 3600));
}
