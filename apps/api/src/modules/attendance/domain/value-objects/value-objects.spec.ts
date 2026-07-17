import { DateOnly } from './date-only';
import { GeoPoint } from './geo-point';
import { TimeWindow } from './time-window';
import { WorkMinutes } from './work-minutes';

describe('attendance value objects', () => {
  it('validates date-only and database conversion', () => {
    expect(DateOnly.parse('2026-07-17').toDatabaseDate().toISOString()).toBe(
      '2026-07-17T00:00:00.000Z',
    );
    expect(() => DateOnly.parse('2026-02-31')).toThrow('DATE_ONLY_INVALID');
  });

  it('validates geospatial values', () => {
    expect(GeoPoint.create(23.588, 58.3829, 10)).toMatchObject({
      latitude: 23.588,
      longitude: 58.3829,
    });
    expect(() => GeoPoint.create(91, 0)).toThrow('GEO_POINT_INVALID');
  });

  it('keeps work minutes non-negative and integral', () => {
    expect(WorkMinutes.of(30).plus(WorkMinutes.of(15)).value).toBe(45);
    expect(WorkMinutes.of(10).minusFloor(WorkMinutes.of(20)).value).toBe(0);
    expect(() => WorkMinutes.of(-1)).toThrow('WORK_MINUTES_INVALID');
  });

  it('creates day and overnight windows in the requested timezone', () => {
    const date = DateOnly.parse('2026-07-17');
    expect(
      TimeWindow.create('09:00', '18:00')
        .bounds(date, 'Asia/Muscat')
        .end.toISO(),
    ).toContain('2026-07-17T18:00:00.000+04:00');
    expect(
      TimeWindow.create('22:00', '06:00')
        .bounds(date, 'Asia/Muscat')
        .end.toISO(),
    ).toContain('2026-07-18T06:00:00.000+04:00');
  });
});
