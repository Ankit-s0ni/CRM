import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_widgets.dart';
import '../../../../l10n/l10n_context.dart';

enum _BaseMapLayer { map, satellite }

class TrackingMapCard extends StatefulWidget {
  const TrackingMapCard({
    super.key,
    required this.active,
    required this.pingCount,
    required this.intervalMinutes,
    this.lastPingAt,
    this.latitude,
    this.longitude,
  });

  final bool active;
  final int pingCount;
  final int intervalMinutes;
  final DateTime? lastPingAt;
  final double? latitude;
  final double? longitude;

  @override
  State<TrackingMapCard> createState() => _TrackingMapCardState();
}

class _TrackingMapCardState extends State<TrackingMapCard> {
  final _mapController = MapController();
  _BaseMapLayer _baseMapLayer = _BaseMapLayer.map;

  LatLng get _location => widget.latitude != null && widget.longitude != null
      ? LatLng(widget.latitude!, widget.longitude!)
      : const LatLng(23.5880, 58.3829);

  bool get _hasCapturedLocation =>
      widget.latitude != null && widget.longitude != null;

  void _moveBy(double zoomDelta) {
    final camera = _mapController.camera;
    _mapController.move(camera.center, (camera.zoom + zoomDelta).clamp(3, 19));
  }

  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(10),
    child: Column(
      children: [
        SizedBox(
          height: 230,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _location,
                    initialZoom: _hasCapturedLocation ? 15 : 11,
                  ),
                  children: [
                    TileLayer(
                      key: ValueKey(_baseMapLayer),
                      urlTemplate: _baseMapLayer == _BaseMapLayer.map
                          ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                          : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                      maxNativeZoom: 19,
                      userAgentPackageName: 'com.deltcrm.employee',
                      tileProvider: NetworkTileProvider(
                        cachingProvider: kDebugMode
                            ? const DisabledMapCachingProvider()
                            : null,
                        silenceExceptions: kDebugMode,
                      ),
                    ),
                    if (_hasCapturedLocation)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _location,
                            width: 42,
                            height: 42,
                            child: _MapPin(active: widget.active),
                          ),
                        ],
                      ),
                  ],
                ),
                Positioned(
                  left: 12,
                  top: 12,
                  child: _MapLayerSwitch(
                    activeLayer: _baseMapLayer,
                    mapLabel: context.l10n.mapView,
                    satelliteLabel: context.l10n.satelliteView,
                    onChanged: (layer) {
                      setState(() => _baseMapLayer = layer);
                    },
                  ),
                ),
                Positioned(
                  right: 14,
                  top: 14,
                  child: Column(
                    children: [
                      _MapControl(icon: Icons.add, onPressed: () => _moveBy(1)),
                      const SizedBox(height: 6),
                      _MapControl(
                        icon: Icons.remove,
                        onPressed: () => _moveBy(-1),
                      ),
                      const SizedBox(height: 6),
                      _MapControl(
                        icon: Icons.my_location_rounded,
                        active: widget.active,
                        onPressed: () => _mapController.move(_location, 15),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  left: 12,
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      widget.active
                          ? widget.lastPingAt == null
                                ? 'Waiting for first secure capture'
                                : 'Last captured ${_relative(widget.lastPingAt!)}'
                          : 'Location paused',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 8,
                  bottom: 6,
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Color(0xEFFFFFFF),
                        borderRadius: BorderRadius.all(Radius.circular(4)),
                      ),
                      child: Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 3,
                        ),
                        child: Text(
                          _baseMapLayer == _BaseMapLayer.map
                              ? '© OpenStreetMap'
                              : '© Esri, Maxar',
                          style: const TextStyle(
                            color: AppTheme.slate,
                            fontSize: 8,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MapMetric(
                value: widget.active ? 'Active' : 'Off',
                label: 'Session',
              ),
            ),
            Expanded(
              child: _MapMetric(
                value: '${widget.pingCount}',
                label: context.l10n.pings,
              ),
            ),
            Expanded(
              child: _MapMetric(
                value: '${widget.intervalMinutes}m',
                label: 'Policy',
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _MapLayerSwitch extends StatelessWidget {
  const _MapLayerSwitch({
    required this.activeLayer,
    required this.mapLabel,
    required this.satelliteLabel,
    required this.onChanged,
  });

  final _BaseMapLayer activeLayer;
  final String mapLabel;
  final String satelliteLabel;
  final ValueChanged<_BaseMapLayer> onChanged;

  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xF7FFFFFF),
    borderRadius: BorderRadius.circular(10),
    elevation: 3,
    child: Padding(
      padding: const EdgeInsets.all(3),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _MapLayerButton(
            icon: Icons.map_outlined,
            label: mapLabel,
            selected: activeLayer == _BaseMapLayer.map,
            onPressed: () => onChanged(_BaseMapLayer.map),
          ),
          _MapLayerButton(
            icon: Icons.satellite_alt_outlined,
            label: satelliteLabel,
            selected: activeLayer == _BaseMapLayer.satellite,
            onPressed: () => onChanged(_BaseMapLayer.satellite),
          ),
        ],
      ),
    ),
  );
}

class _MapLayerButton extends StatelessWidget {
  const _MapLayerButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: label,
    child: InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onPressed,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 70),
        padding: const EdgeInsets.symmetric(horizontal: 9),
        decoration: BoxDecoration(
          color: selected ? AppTheme.charcoal : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected ? Colors.white : AppTheme.charcoal,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : AppTheme.charcoal,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

String _relative(DateTime value) {
  final minutes = DateTime.now().difference(value.toLocal()).inMinutes;
  if (minutes < 1) return 'just now';
  if (minutes < 60) return '${minutes}m ago';
  return '${minutes ~/ 60}h ago';
}

class _MapPin extends StatelessWidget {
  const _MapPin({required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: active ? AppTheme.green : AppTheme.slate,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 4),
        boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 7)],
      ),
      child: const Icon(
        Icons.navigation_rounded,
        color: Colors.white,
        size: 13,
      ),
    ),
  );
}

class _MapControl extends StatelessWidget {
  const _MapControl({
    required this.icon,
    required this.onPressed,
    this.active = false,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final bool active;

  @override
  Widget build(BuildContext context) => Material(
    color: active ? AppTheme.charcoal : Colors.white,
    borderRadius: BorderRadius.circular(9),
    child: InkWell(
      borderRadius: BorderRadius.circular(9),
      onTap: onPressed,
      child: SizedBox(
        width: 34,
        height: 34,
        child: Icon(
          icon,
          size: 17,
          color: active ? Colors.white : AppTheme.charcoal,
        ),
      ),
    ),
  );
}

class _MapMetric extends StatelessWidget {
  const _MapMetric({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(
        value,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(color: AppTheme.slate, fontSize: 10)),
    ],
  );
}
