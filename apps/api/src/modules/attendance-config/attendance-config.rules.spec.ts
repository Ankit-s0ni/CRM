import {
  assertPolicyRules,
  haversineMeters,
  isOvernightShift,
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
});
