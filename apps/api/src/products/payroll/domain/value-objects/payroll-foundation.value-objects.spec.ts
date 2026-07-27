import {
  assertEffectiveDateRange,
  parseDateOnly,
  rangesOverlap,
} from './effective-date-range';
import { MoneyValue } from './money-value';

describe('Payroll foundation value objects', () => {
  it('rejects inverted effective date ranges', () => {
    expect(() =>
      assertEffectiveDateRange({
        effectiveFrom: parseDateOnly('2026-07-31'),
        effectiveTo: parseDateOnly('2026-07-01'),
      }),
    ).toThrow('Effective end date must not be before the start date');
  });

  it('detects overlapping effective ranges', () => {
    expect(
      rangesOverlap(
        {
          effectiveFrom: parseDateOnly('2026-07-01'),
          effectiveTo: parseDateOnly('2026-07-31'),
        },
        {
          effectiveFrom: parseDateOnly('2026-07-15'),
          effectiveTo: parseDateOnly('2026-08-31'),
        },
      ),
    ).toBe(true);
  });

  it('stores OMR compensation in integer minor units', () => {
    const money = MoneyValue.fromMinor('123456', 'OMR');
    expect(money.amountMinor).toBe(123456n);
    expect(MoneyValue.scaleFor('OMR')).toBe(3);
  });

  it('rejects unsupported payroll currencies', () => {
    expect(() => MoneyValue.fromMinor('100', 'XYZ')).toThrow(
      'Currency is not supported for payroll foundation',
    );
  });
});
