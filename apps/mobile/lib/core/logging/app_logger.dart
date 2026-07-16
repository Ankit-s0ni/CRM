import 'dart:developer' as developer;

enum LogLevel { debug, info, warning, error }

class AppLogger {
  AppLogger._();

  static void debug(String message, [Object? error, StackTrace? stack]) =>
      _write(LogLevel.debug, message, error, stack);
  static void info(String message, [Object? error, StackTrace? stack]) =>
      _write(LogLevel.info, message, error, stack);
  static void warning(String message, [Object? error, StackTrace? stack]) =>
      _write(LogLevel.warning, message, error, stack);
  static void error(String message, [Object? error, StackTrace? stack]) =>
      _write(LogLevel.error, message, error, stack);

  static void _write(
    LogLevel level,
    String message,
    Object? error,
    StackTrace? stack,
  ) {
    developer.log(
      '[${level.name.toUpperCase()}] $message',
      name: 'hrms.mobile',
      error: error,
      stackTrace: stack,
    );
  }
}
