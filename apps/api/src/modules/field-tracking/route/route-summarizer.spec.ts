import { haversineMeters, summarizeRoute } from './route-summarizer';

describe('route summarizer', () => {
  it('calculates distance, a dwell stop, and a tracking gap deterministically', () => {
    const start = new Date('2026-07-17T06:00:00.000Z');
    const points = [
      point('a', 23.588, 58.382, start),
      point('b', 23.58801, 58.38201, plus(start, 3)),
      point('c', 23.58802, 58.382, plus(start, 6)),
      point('d', 23.59, 58.384, plus(start, 28)),
      point('e', 23.591, 58.385, plus(start, 30)),
    ];

    const result = summarizeRoute(points);

    expect(result.pingCount).toBe(5);
    expect(result.acceptedPingCount).toBe(5);
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0]?.dwellMinutes).toBe(6);
    expect(result.gaps).toEqual([
      expect.objectContaining({ durationMinutes: 22 }),
    ]);
    expect(result.trackingGapMinutes).toBe(22);
    expect(result.distanceMeters).toBeGreaterThan(300);
    expect(result.path.length).toBeGreaterThanOrEqual(2);
  });

  it('retains raw count but rejects inaccurate and impossible points', () => {
    const start = new Date('2026-07-17T06:00:00.000Z');
    const result = summarizeRoute([
      point('a', 23.588, 58.382, start),
      {
        ...point('bad-accuracy', 23.5881, 58.3821, plus(start, 1)),
        accuracyM: 500,
      },
      point('teleport', 24.588, 59.382, plus(start, 2)),
      point('b', 23.5882, 58.3822, plus(start, 3)),
    ]);

    expect(result.pingCount).toBe(4);
    expect(result.acceptedPingCount).toBe(2);
    expect(result.rejectedPingCount).toBe(2);
  });

  it('uses Haversine distance in meters', () => {
    expect(
      haversineMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ),
    ).toBeCloseTo(111_195, -1);
  });
});

function point(
  id: string,
  latitude: number,
  longitude: number,
  capturedAt: Date,
) {
  return {
    id,
    latitude,
    longitude,
    accuracyM: 10,
    speedMps: null,
    capturedAt,
  };
}

function plus(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}
