import {
  assertPolicyRules,
  haversineMeters,
  isOvernightShift,
  networkIncludesAddress,
  normalizeNetworkEntries,
  resolvePolicy,
  resolveShift,
} from './attendance-config.rules';

describe('attendance configuration rules', () => {
  it('calculates a stable Haversine distance', () => {
    const distance = haversineMeters(
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9725, longitude: 77.5946 },
    );
    expect(distance).toBeGreaterThan(99);
    expect(distance).toBeLessThan(102);
  });

  it('resolves policy by employee, department, then tenant default', () => {
    const result = resolvePolicy([
      { scope: 'TENANT_DEFAULT', value: 'default' },
      { scope: 'DEPARTMENT', value: 'department' },
      { scope: 'EMPLOYEE', value: 'employee' },
    ]);
    expect(result?.value).toBe('employee');
  });

  it('derives overnight shifts and rejects equal times', () => {
    expect(isOvernightShift('22:00', '06:00')).toBe(true);
    expect(isOvernightShift('09:00', '18:00')).toBe(false);
    expect(() => isOvernightShift('09:00', '09:00')).toThrow();
  });

  it('uses roster, default, and flexible shift fallback order', () => {
    expect(
      resolveShift({ roster: 'night', employeeDefault: 'day' })?.value,
    ).toBe('night');
    expect(
      resolveShift({ employeeDefault: 'day', flexible: 'flex' })?.source,
    ).toBe('EMPLOYEE_DEFAULT');
    expect(resolveShift({ flexible: 'flex' })?.source).toBe('FLEXIBLE');
  });

  it('rejects contradictory policy thresholds', () => {
    expect(() =>
      assertPolicyRules({
        lateAfterMinutes: 300,
        halfDayAfterMinutes: 200,
        minimumWorkMinutes: 480,
        overtimeAfterMinutes: 540,
        maxOfflineSyncHours: 48,
        maxFaceAttempts: 3,
      }),
    ).toThrow();
  });

  it('matches exact and CIDR office networks without accepting adjacent addresses', () => {
    expect(networkIncludesAddress('203.0.113.9', '203.0.113.9')).toBe(true);
    expect(networkIncludesAddress('203.0.113.0/24', '203.0.113.99')).toBe(true);
    expect(networkIncludesAddress('203.0.113.0/24', '203.0.114.1')).toBe(false);
    expect(networkIncludesAddress('127.0.0.1', '::ffff:127.0.0.1')).toBe(true);
  });

  it('normalizes valid IPv4 and IPv6 network entries and rejects invalid CIDR', () => {
    expect(
      normalizeNetworkEntries([' 203.0.113.0/24 ', '2001:db8::/32']),
    ).toEqual(['203.0.113.0/24', '2001:db8::/32']);
    expect(() => normalizeNetworkEntries(['203.0.113.0/33'])).toThrow();
    expect(() => normalizeNetworkEntries(['not-an-address'])).toThrow();
  });
});
