import 'package:flutter/material.dart';
import '../widgets/company_mark.dart';
import '../../../../l10n/l10n_context.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.onReady});
  final VoidCallback onReady;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 700), () {
      if (mounted) widget.onReady();
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CompanyMark(),
            const SizedBox(height: 20),
            Text(context.l10n.checkingSession),
            const SizedBox(height: 14),
            const SizedBox(width: 120, child: LinearProgressIndicator()),
          ],
        ),
      ),
    ),
  );
}
