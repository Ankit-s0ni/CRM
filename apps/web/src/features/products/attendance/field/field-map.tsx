"use client";

import { Map as MapIcon, MapPin, Satellite } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { cn } from "@/lib/utils";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type MapMarker = MapCoordinate & {
  id: string;
  label?: string;
  tone?: "live" | "stale" | "offline" | "stop" | "gap" | "punch" | "alert";
};

type Geofence = MapCoordinate & {
  id: string;
  radiusMeters: number;
  label: string;
};

export interface FieldMapProviderProps {
  markers?: MapMarker[];
  path?: MapCoordinate[];
  geofences?: Geofence[];
  selectedId?: string;
  onMarkerSelect?: (id: string) => void;
  onMapClick?: (coordinate: MapCoordinate) => void;
  className?: string;
}

type BaseMapLayer = "map" | "satellite";

export function FieldMap(props: FieldMapProviderProps) {
  const provider = process.env.NEXT_PUBLIC_FIELD_MAP_PROVIDER;
  return provider === "deterministic" ? (
    <DeterministicFieldMap {...props} />
  ) : (
    <OpenStreetMapFieldMap {...props} />
  );
}

function OpenStreetMapFieldMap({
  markers = [],
  path = [],
  geofences = [],
  selectedId,
  onMarkerSelect,
  onMapClick,
  className,
}: FieldMapProviderProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const baseLayers = useRef<Record<
    BaseMapLayer,
    import("leaflet").TileLayer
  > | null>(null);
  const featureLayer = useRef<import("leaflet").LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [baseLayer, setBaseLayer] = useState<BaseMapLayer>("map");
  const [failed, setFailed] = useState(false);
  const { tText } = useTenantLocalization();
  const emitMapClick = useEffectEvent((coordinate: MapCoordinate) => {
    onMapClick?.(coordinate);
  });
  const emitMarkerSelect = useEffectEvent((id: string) => {
    onMarkerSelect?.(id);
  });
  const changeBaseLayer = (nextLayer: BaseMapLayer) => {
    setBaseLayer(nextLayer);
    const map = mapInstance.current;
    const layers = baseLayers.current;
    if (!map || !layers) return;
    if (map.hasLayer(layers.map)) map.removeLayer(layers.map);
    if (map.hasLayer(layers.satellite)) map.removeLayer(layers.satellite);
    if (!map.hasLayer(layers[nextLayer])) layers[nextLayer].addTo(map);
  };

  useEffect(() => {
    let active = true;
    let map: import("leaflet").Map | undefined;
    void import("leaflet")
      .then((leaflet) => {
        if (!active || !container.current) return;
        const center = { latitude: 23.588, longitude: 58.3829 };
        const initializedMap = leaflet.map(container.current, {
          center: [center.latitude, center.longitude],
          scrollWheelZoom: true,
          zoom: 10,
        });
        map = initializedMap;
        mapInstance.current = initializedMap;
        initializedMap.on("click", (event) => {
          emitMapClick({
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          });
        });
        const streetLayer = leaflet.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          },
        );
        const satelliteLayer = leaflet.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
            maxZoom: 19,
          },
        );
        baseLayers.current = {
          map: streetLayer,
          satellite: satelliteLayer,
        };
        streetLayer.addTo(initializedMap);
        setMapReady(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      featureLayer.current = null;
      map?.remove();
      mapInstance.current = null;
      baseLayers.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    let active = true;
    void import("leaflet").then((leaflet) => {
      const map = mapInstance.current;
      if (!active || !map) return;

      featureLayer.current?.remove();
      const nextFeatureLayer = leaflet.layerGroup().addTo(map);
      featureLayer.current = nextFeatureLayer;

      geofences.forEach((office) => {
        leaflet.circle([office.latitude, office.longitude], {
          fillColor: "#434343",
          fillOpacity: 0.08,
          radius: office.radiusMeters,
          color: "#434343",
          opacity: 0.8,
          weight: 2,
        }).addTo(nextFeatureLayer);
      });
      if (path.length > 1) {
        leaflet.polyline(
          path.map(({ latitude, longitude }) => [latitude, longitude]),
          { color: "#27272a", opacity: 0.95, weight: 5 },
        ).addTo(nextFeatureLayer);
      }
      markers.forEach((marker) => {
        const pin = leaflet.marker([marker.latitude, marker.longitude], {
          icon: leaflet.divIcon({
            className: "field-map-marker",
            html: `<span class="field-map-marker__pin field-map-marker__pin--${marker.tone ?? "default"} ${marker.id === selectedId ? "field-map-marker__pin--selected" : ""}"></span>`,
            iconAnchor: [15, 30],
            iconSize: [30, 30],
          }),
          title: marker.label ?? "Field employee",
        });
        pin.on("click", () => emitMarkerSelect(marker.id));
        pin.addTo(nextFeatureLayer);
      });

      const uniquePoints = Array.from(
        new Map(
          [...markers, ...path, ...geofences].map((point) => [
            `${point.latitude}:${point.longitude}`,
            point,
          ]),
        ).values(),
      );
      if (uniquePoints.length === 1) {
        map.setView(
          [uniquePoints[0].latitude, uniquePoints[0].longitude],
          14,
          { animate: false },
        );
      } else if (uniquePoints.length > 1) {
        const bounds = leaflet.latLngBounds(
          uniquePoints.map((point) => [point.latitude, point.longitude]),
        );
        map.fitBounds(bounds, { animate: false, padding: [52, 52] });
      }
      requestAnimationFrame(() => {
        if (active && mapInstance.current === map) {
          map.invalidateSize({ animate: false });
        }
      });
    }).catch(() => {
      if (active) setFailed(true);
    });

    return () => {
      active = false;
    };
  }, [geofences, mapReady, markers, path, selectedId]);

  if (failed) {
    return (
      <DeterministicFieldMap
        className={className}
        geofences={geofences}
        markers={markers}
        onMarkerSelect={onMarkerSelect}
        onMapClick={onMapClick}
        path={path}
        selectedId={selectedId}
      />
    );
  }
  return (
    <div
      className={cn(
        "relative isolate z-0 min-h-[460px] overflow-hidden rounded-2xl border border-zinc-300 bg-stone-200",
        onMapClick && "cursor-crosshair",
        className,
      )}
      data-map-provider="openstreetmap"
    >
      <div
        aria-label={tText("Field location map")}
        className="absolute inset-0"
        ref={container}
      />
      <MapLayerSwitch
        activeLayer={baseLayer}
        mapLabel={tText("Map")}
        onChange={changeBaseLayer}
        satelliteLabel={tText("Satellite")}
      />
      <style jsx global>{`
        .field-map-marker__pin { display:block; width:30px; height:30px; border:4px solid white; border-radius:999px 999px 999px 0; box-shadow:0 4px 12px rgba(25,24,35,.28); transform:rotate(-45deg); }
        .field-map-marker__pin--live { background:#138a55; }
        .field-map-marker__pin--stale, .field-map-marker__pin--gap { background:#c06b18; }
        .field-map-marker__pin--offline { background:#a5a5a5; }
        .field-map-marker__pin--stop { background:#0d6e78; }
        .field-map-marker__pin--punch { background:#a23063; }
        .field-map-marker__pin--alert { background:#dc2626; }
        .field-map-marker__pin--default { background:#27272a; }
        .field-map-marker__pin--selected { box-shadow:0 0 0 5px rgba(53,37,205,.24),0 4px 12px rgba(25,24,35,.28); }
      `}</style>
    </div>
  );
}

export function DeterministicFieldMap({
  markers = [],
  path = [],
  geofences = [],
  selectedId,
  onMarkerSelect,
  onMapClick,
  className,
}: FieldMapProviderProps) {
  const [baseLayer, setBaseLayer] = useState<BaseMapLayer>("map");
  const { tText } = useTenantLocalization();
  const all = [
    ...markers,
    ...path,
    ...geofences,
  ];
  const bounds = mapBounds(all);
  const projectedPath = path.map((point) => project(point, bounds));
  return (
    <div
      className={cn(
        "relative isolate z-0 min-h-[460px] overflow-hidden rounded-2xl border border-zinc-300 bg-stone-200",
        onMapClick && "cursor-crosshair",
        className,
      )}
      data-map-provider="deterministic"
      onClick={(event) => {
        if (!onMapClick) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        onMapClick({
          latitude: bounds.maxLat - y * (bounds.maxLat - bounds.minLat),
          longitude: bounds.minLng + x * (bounds.maxLng - bounds.minLng),
        });
      }}
    >
      {baseLayer === "map" ? (
        <>
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#c9c6c0_1px,transparent_1px),linear-gradient(90deg,#c9c6c0_1px,transparent_1px)] [background-size:52px_52px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,.9),transparent_24%),radial-gradient(circle_at_80%_72%,rgba(215,225,213,.8),transparent_28%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#43523d] [background-image:radial-gradient(circle_at_18%_24%,#8d9270_0_9%,transparent_10%),radial-gradient(circle_at_72%_68%,#315d49_0_14%,transparent_15%),radial-gradient(circle_at_48%_38%,#6f7552_0_20%,transparent_21%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(28deg,transparent_46%,#c9c39a_47%_49%,transparent_50%),linear-gradient(118deg,transparent_47%,#74806a_48%_50%,transparent_51%)] [background-size:130px_110px]" />
        </>
      )}
      <svg
        aria-label={tText("Field location map")}
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        <g className="stroke-stone-400" opacity=".45">
          <path d="M0 115 C180 80 250 175 410 142 S720 55 1000 112" fill="none" strokeWidth="20" />
          <path d="M165 0 C185 130 120 290 205 600" fill="none" strokeWidth="12" />
          <path d="M0 470 C230 420 410 530 640 460 S820 390 1000 430" fill="none" strokeWidth="10" />
        </g>
        {geofences.map((office) => {
          const point = project(office, bounds);
          return (
            <g key={office.id}>
              <circle cx={point.x} cy={point.y} fill="#4343431c" r={Math.max(24, Math.min(80, office.radiusMeters / 5))} stroke="#434343" strokeDasharray="6 5" strokeWidth="2" />
              <text fill="#27272a" fontSize="12" fontWeight="700" x={point.x + 12} y={point.y - 14}>{office.label}</text>
            </g>
          );
        })}
        {projectedPath.length > 1 && (
          <polyline
            fill="none"
            points={projectedPath.map(({ x, y }) => `${x},${y}`).join(" ")}
            stroke="#27272a"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
        )}
      </svg>
      {markers.map((marker) => {
        const point = project(marker, bounds);
        const active = marker.id === selectedId;
        return (
          <button
            aria-label={marker.label ?? "Map marker"}
            className="absolute -translate-x-1/2 -translate-y-full"
            key={marker.id}
            onClick={(event) => {
              event.stopPropagation();
              onMarkerSelect?.(marker.id);
            }}
            style={{ left: `${point.x / 10}%`, top: `${point.y / 6}%` }}
            type="button"
          >
            <span className={cn(
              "grid size-9 place-items-center rounded-full border-4 border-white text-white shadow-lg transition",
              markerTone(marker.tone),
              active && "scale-125 ring-4 ring-[#151515]/20",
            )}>
              <MapPin className="size-4" />
            </span>
            {marker.label && (
              <span className="mt-1 block max-w-32 truncate rounded-md bg-zinc-700 px-2 py-1 text-[10px] font-semibold text-white shadow">
                {marker.label}
              </span>
            )}
          </button>
        );
      })}
      <MapLayerSwitch
        activeLayer={baseLayer}
        mapLabel={tText("Map")}
        onChange={setBaseLayer}
        satelliteLabel={tText("Satellite")}
      />
      <div className="absolute bottom-3 left-3 rounded-lg border border-zinc-300 bg-white/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-zinc-500 shadow-sm backdrop-blur">
        {baseLayer === "map"
          ? tText("Deterministic map provider")
          : tText("Deterministic satellite preview")}
      </div>
    </div>
  );
}

function MapLayerSwitch({
  activeLayer,
  mapLabel,
  satelliteLabel,
  onChange,
}: {
  activeLayer: BaseMapLayer;
  mapLabel: string;
  satelliteLabel: string;
  onChange: (layer: BaseMapLayer) => void;
}) {
  return (
    <div
      aria-label={`${mapLabel} / ${satelliteLabel}`}
      className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 rounded-xl border border-white/70 bg-white/95 p-1 shadow-lg backdrop-blur"
      onClick={(event) => event.stopPropagation()}
      role="group"
    >
      {[
        { id: "map" as const, label: mapLabel, Icon: MapIcon },
        { id: "satellite" as const, label: satelliteLabel, Icon: Satellite },
      ].map(({ id, label, Icon }) => (
        <button
          aria-pressed={activeLayer === id}
          className={cn(
            "flex h-11 min-w-24 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors",
            activeLayer === id
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
          )}
          key={id}
          onClick={() => onChange(id)}
          type="button"
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function mapBounds(points: MapCoordinate[]) {
  if (!points.length) return { minLat: 23.45, maxLat: 23.7, minLng: 58.25, maxLng: 58.55 };
  const latitudes = points.map(({ latitude }) => latitude);
  const longitudes = points.map(({ longitude }) => longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPad = Math.max((maxLat - minLat) * 0.15, 0.002);
  const lngPad = Math.max((maxLng - minLng) * 0.15, 0.002);
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function project(point: MapCoordinate, bounds: ReturnType<typeof mapBounds>) {
  return {
    x: 60 + ((point.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 880,
    y: 540 - ((point.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 480,
  };
}

function markerTone(tone: MapMarker["tone"]) {
  if (tone === "live") return "bg-emerald-700";
  if (tone === "stale" || tone === "gap") return "bg-amber-600";
  if (tone === "offline") return "bg-outline";
  if (tone === "stop") return "bg-cyan-700";
  if (tone === "punch") return "bg-rose-700";
  if (tone === "alert") return "bg-red-600";
  return "bg-[#151515]";
}
