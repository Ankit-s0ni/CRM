import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class ProfileHeader extends StatelessWidget {
  const ProfileHeader({
    super.key,
    required this.name,
    required this.employeeCode,
    required this.designation,
    required this.department,
  });
  final String name;
  final String employeeCode;
  final String designation;
  final String department;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Stack(
        clipBehavior: Clip.none,
        children: [
          CircleAvatar(
            radius: 48,
            backgroundColor: AppTheme.charcoal,
            child: Text(
              _initials(name),
              style: TextStyle(
                color: Colors.white,
                fontSize: 23,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          PositionedDirectional(
            end: -2,
            bottom: -2,
            child: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: AppTheme.green,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
              ),
              child: const Icon(
                Icons.check_rounded,
                color: Colors.white,
                size: 15,
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 14),
      Text(name, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 4),
      Text(
        '$employeeCode · $designation',
        style: const TextStyle(
          color: AppTheme.slate,
          fontWeight: FontWeight.w600,
        ),
      ),
      const SizedBox(height: 9),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: AppTheme.green.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Text(
          department,
          style: const TextStyle(
            color: AppTheme.charcoal,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    ],
  );
}

String _initials(String name) => name
    .trim()
    .split(RegExp(r'\s+'))
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part[0].toUpperCase())
    .join();
