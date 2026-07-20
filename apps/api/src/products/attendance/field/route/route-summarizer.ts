export type RoutePoint = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  speedMps: number | null;
  capturedAt: Date;
};

export type RouteStop = {
  latitude: number;
  longitude: number;
  startedAt: string;
  endedAt: string;
  dwellMinutes: number;
};

export type RouteGap = {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
};

export type RouteSummary = {
  path: Array<{ latitude: number; longitude: number; capturedAt: string }>;
  distanceMeters: number;
  pingCount: number;
  acceptedPingCount: number;
  rejectedPingCount: number;
  trackingGapMinutes: number;
  stops: RouteStop[];
  gaps: RouteGap[];
  sourceStartedAt: Date | null;
  sourceEndedAt: Date | null;
};

const MAX_ROUTE_ACCURACY_M = 250;
const MAX_ROUTE_SPEED_MPS = 100;
const STOP_RADIUS_M = 50;
const STOP_DWELL_MS = 5 * 60_000;
const GAP_THRESHOLD_MS = 5 * 60_000;

export function summarizeRoute(input: RoutePoint[]): RouteSummary {
  const points = [...input].sort(
    (left, right) =>
      left.capturedAt.getTime() - right.capturedAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const accepted: RoutePoint[] = [];
  let distanceMeters = 0;
  for (const point of points) {
    if (point.accuracyM !== null && point.accuracyM > MAX_ROUTE_ACCURACY_M) {
      continue;
    }
    const previous = accepted.at(-1);
    if (previous) {
      const distance = haversineMeters(previous, point);
      const elapsedSeconds =
        (point.capturedAt.getTime() - previous.capturedAt.getTime()) / 1_000;
      const impliedSpeed =
        elapsedSeconds > 0 ? distance / elapsedSeconds : Infinity;
      if (
        elapsedSeconds <= 0 ||
        (point.speedMps !== null && point.speedMps > MAX_ROUTE_SPEED_MPS) ||
        impliedSpeed > MAX_ROUTE_SPEED_MPS
      ) {
        continue;
      }
      distanceMeters += distance;
    }
    accepted.push(point);
  }

  const gaps: RouteGap[] = [];
  for (let index = 1; index < accepted.length; index += 1) {
    const previous = accepted[index - 1];
    const current = accepted[index];
    const durationMs =
      current.capturedAt.getTime() - previous.capturedAt.getTime();
    if (durationMs > GAP_THRESHOLD_MS) {
      gaps.push({
        startedAt: previous.capturedAt.toISOString(),
        endedAt: current.capturedAt.toISOString(),
        durationMinutes: Math.round(durationMs / 60_000),
      });
    }
  }

  return {
    path: simplifyRoute(accepted).map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      capturedAt: point.capturedAt.toISOString(),
    })),
    distanceMeters: Math.round(distanceMeters),
    pingCount: points.length,
    acceptedPingCount: accepted.length,
    rejectedPingCount: points.length - accepted.length,
    trackingGapMinutes: gaps.reduce(
      (total, gap) => total + gap.durationMinutes,
      0,
    ),
    stops: findStops(accepted),
    gaps,
    sourceStartedAt: accepted[0]?.capturedAt ?? null,
    sourceEndedAt: accepted.at(-1)?.capturedAt ?? null,
  };
}

export function haversineMeters(
  left: Pick<RoutePoint, 'latitude' | 'longitude'>,
  right: Pick<RoutePoint, 'latitude' | 'longitude'>,
) {
  const earthRadius = 6_371_000;
  const lat1 = radians(left.latitude);
  const lat2 = radians(right.latitude);
  const deltaLat = radians(right.latitude - left.latitude);
  const deltaLng = radians(right.longitude - left.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findStops(points: RoutePoint[]) {
  const stops: RouteStop[] = [];
  let start = 0;
  while (start < points.length) {
    let end = start;
    while (
      end + 1 < points.length &&
      haversineMeters(points[start], points[end + 1]) <= STOP_RADIUS_M
    ) {
      end += 1;
    }
    const first = points[start];
    const last = points[end];
    const dwellMs = last.capturedAt.getTime() - first.capturedAt.getTime();
    if (end > start && dwellMs >= STOP_DWELL_MS) {
      const group = points.slice(start, end + 1);
      stops.push({
        latitude:
          group.reduce((total, point) => total + point.latitude, 0) /
          group.length,
        longitude:
          group.reduce((total, point) => total + point.longitude, 0) /
          group.length,
        startedAt: first.capturedAt.toISOString(),
        endedAt: last.capturedAt.toISOString(),
        dwellMinutes: Math.round(dwellMs / 60_000),
      });
    }
    start = Math.max(start + 1, end + 1);
  }
  return stops;
}

function simplifyRoute(points: RoutePoint[], toleranceM = 10): RoutePoint[] {
  if (points.length <= 2) return points;
  let furthestDistance = 0;
  let furthestIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = segmentDistanceMeters(
      points[index],
      points[0],
      points.at(-1)!,
    );
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  if (furthestDistance <= toleranceM) return [points[0], points.at(-1)!];
  const left = simplifyRoute(points.slice(0, furthestIndex + 1), toleranceM);
  const right = simplifyRoute(points.slice(furthestIndex), toleranceM);
  return [...left.slice(0, -1), ...right];
}

function segmentDistanceMeters(
  point: RoutePoint,
  start: RoutePoint,
  end: RoutePoint,
) {
  const scale = Math.cos(radians((start.latitude + end.latitude) / 2));
  const x = (point.longitude - start.longitude) * scale;
  const y = point.latitude - start.latitude;
  const endX = (end.longitude - start.longitude) * scale;
  const endY = end.latitude - start.latitude;
  const lengthSquared = endX * endX + endY * endY;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (x * endX + y * endY) / lengthSquared));
  const projected = {
    latitude: start.latitude + projection * endY,
    longitude: start.longitude + (projection * endX) / (scale || 1),
  };
  return haversineMeters(point, projected);
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}
