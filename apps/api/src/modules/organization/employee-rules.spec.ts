import { HttpException } from '@nestjs/common';
import {
  assertCanReactivate,
  assertCanTerminate,
  assertEmploymentDates,
  assertNoManagerCycle,
  normalizeEmployeeCode,
  parseDateOnly,
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
});
