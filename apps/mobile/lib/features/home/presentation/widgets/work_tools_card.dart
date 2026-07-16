import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../l10n/l10n_context.dart';

class WorkToolsCard extends StatelessWidget {
  const WorkToolsCard({
    super.key,
    required this.isOnBreak,
    required this.showFieldTracking,
    required this.onSelected,
  });

  final bool isOnBreak;
  final bool showFieldTracking;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final tools = <_WorkTool>[
      _WorkTool(
        id: 'break',
        icon: isOnBreak ? Icons.play_arrow_rounded : Icons.coffee_outlined,
        label: isOnBreak ? context.l10n.endBreak : context.l10n.takeBreak,
      ),
      if (showFieldTracking)
        _WorkTool(
          id: 'tracking',
          icon: Icons.route_outlined,
          label: context.l10n.fieldTracking,
        ),
      _WorkTool(
        id: 'sync',
        icon: Icons.cloud_sync_outlined,
        label: context.l10n.offlineSync,
      ),
      _WorkTool(
        id: 'settings',
        icon: Icons.tune_rounded,
        label: context.l10n.settings,
      ),
      _WorkTool(
        id: 'failure',
        icon: Icons.verified_user_outlined,
        label: context.l10n.failureStates,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.workTools,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 10),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisExtent: 64,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemCount: tools.length,
          itemBuilder: (context, index) {
            final tool = tools[index];
            return Material(
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppTheme.line),
              ),
              child: InkWell(
                onTap: () => onSelected(tool.id),
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 13),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.canvas,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(tool.icon, size: 19),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          tool.label,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _WorkTool {
  const _WorkTool({required this.id, required this.icon, required this.label});

  final String id;
  final IconData icon;
  final String label;
}
