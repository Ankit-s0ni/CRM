import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static const charcoal = Color(0xFF1E2329);
  static const slate = Color(0xFF68717C);
  static const canvas = Color(0xFFF7F8F9);
  static const line = Color(0xFFE4E7EB);
  static const green = Color(0xFF238B68);
  static const danger = Color(0xFFB5423C);
  static const warmSurface = Color(0xFFFFF5E8);
  static const warmLine = Color(0xFFF1D8B6);
  static const warmText = Color(0xFF85551F);

  static ThemeData light({Color primary = charcoal}) => ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: canvas,
    colorScheme: ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      secondary: green,
      onSecondary: Colors.white,
      surface: Colors.white,
      onSurface: charcoal,
      error: danger,
    ),
    visualDensity: VisualDensity.standard,
    appBarTheme: const AppBarTheme(
      backgroundColor: canvas,
      foregroundColor: charcoal,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(
        color: charcoal,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: -.3,
      ),
    ),
    textTheme: const TextTheme(
      displaySmall: TextStyle(
        color: charcoal,
        fontSize: 38,
        height: 1.08,
        fontWeight: FontWeight.w800,
        letterSpacing: -1.25,
      ),
      headlineSmall: TextStyle(
        color: charcoal,
        fontSize: 24,
        fontWeight: FontWeight.w800,
        letterSpacing: -.45,
      ),
      titleLarge: TextStyle(
        color: charcoal,
        fontSize: 19,
        fontWeight: FontWeight.w800,
        letterSpacing: -.2,
      ),
      titleMedium: TextStyle(
        color: charcoal,
        fontSize: 15,
        fontWeight: FontWeight.w700,
      ),
      bodyLarge: TextStyle(color: charcoal, fontSize: 16, height: 1.5),
      bodyMedium: TextStyle(color: charcoal, fontSize: 14, height: 1.45),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: charcoal, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: danger, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: line),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      insetPadding: const EdgeInsets.all(16),
      contentTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
      showCloseIcon: true,
      closeIconColor: Colors.white70,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      titleTextStyle: const TextStyle(
        color: charcoal,
        fontSize: 21,
        fontWeight: FontWeight.w800,
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: Color(0xFFE8EAEC),
      height: 72,
      labelTextStyle: WidgetStatePropertyAll(
        TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(48, 48)),
        padding: const WidgetStatePropertyAll(
          EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        ),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
        ),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(44, 44)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
        ),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    ),
    iconButtonTheme: const IconButtonThemeData(
      style: ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(44, 44))),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: charcoal,
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      titleTextStyle: TextStyle(
        color: charcoal,
        fontSize: 14,
        fontWeight: FontWeight.w700,
      ),
      subtitleTextStyle: TextStyle(color: slate, fontSize: 12, height: 1.4),
    ),
    dividerTheme: const DividerThemeData(color: line, thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: charcoal,
      linearTrackColor: line,
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
