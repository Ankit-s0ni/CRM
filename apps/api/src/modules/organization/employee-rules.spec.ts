import { HttpException } from '@nestjs/common';
import {
  assertCanReactivate,
  assertCanTerminate,
  assertEmploymentDates,
  assertNoManagerCycle,
  normalizeEmployeeCode,
  parseDateOnly,
  temporaryEmployeePassword,
} from './employee-rules';

describe('employee rules', () => {
  it('normalizes employee codes and validates date-only values', () => {
    expect(normalizeEmployeeCode(' emp  42 ')).toBe('EMP-42');
    expect(parseDateOnly('2026-07-16').toISOString()).toBe(
      '2026-07-16T00:00:00.000Z',
    );
    expect(() => parseDateOnly('2026-02-30')).toThrow(HttpException);
    expect(() =>
      assertEmploymentDates(
        parseDateOnly('2026-07-16'),
        parseDateOnly('2026-07-15'),
      ),
    ).toThrow(HttpException);
  });

  it('rejects self-management and indirect manager cycles', () => {
    const graph = [
      { id: 'a', managerId: null },
      { id: 'b', managerId: 'a' },
      { id: 'c', managerId: 'b' },
    ];

    expect(() => assertNoManagerCycle('a', 'a', graph)).toThrow(HttpException);
    expect(() => assertNoManagerCycle('a', 'c', graph)).toThrow(HttpException);
    expect(() => assertNoManagerCycle('c', 'a', graph)).not.toThrow();
  });

  it('enforces terminate and reactivate state transitions', () => {
    expect(() => assertCanTerminate('ACTIVE')).not.toThrow();
    expect(() => assertCanTerminate('TERMINATED')).toThrow(HttpException);
    expect(() => assertCanReactivate('TERMINATED')).not.toThrow();
    expect(() => assertCanReactivate('ON_NOTICE')).toThrow(HttpException);
  });

  it.each([
    ['India', '+919876543210', 'AaravSharma987654'],
    ['United States', '+14155552671', 'AaravSharma415555'],
    ['Oman', '+96892123456', 'AaravSharma921234'],
    ['United Arab Emirates', '+971501234567', 'AaravSharma501234'],
  ])(
    'uses national digits for %s temporary passwords',
    (_country, phone, expected) => {
      expect(temporaryEmployeePassword('Aarav Sharma', phone)).toBe(expected);
    },
  );
});
