import { UnprocessableEntityException } from '@nestjs/common';

export type EffectiveRange = {
  effectiveFrom: Date;
  effectiveTo?: Date | null;
};

export function parseDateOnly(
  value: string,
  code = 'INVALID_EFFECTIVE_DATE_RANGE',
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new UnprocessableEntityException({
      code,
      message: 'Date must use YYYY-MM-DD format',
    });
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function assertEffectiveDateRange(range: EffectiveRange) {
  if (range.effectiveTo && range.effectiveTo < range.effectiveFrom) {
    throw new UnprocessableEntityException({
      code: 'INVALID_EFFECTIVE_DATE_RANGE',
      message: 'Effective end date must not be before the start date',
    });
  }
}

export function rangesOverlap(left: EffectiveRange, right: EffectiveRange) {
  const leftEnd = left.effectiveTo ?? maxDate();
  const rightEnd = right.effectiveTo ?? maxDate();
  return left.effectiveFrom <= rightEnd && right.effectiveFrom <= leftEnd;
}

function maxDate() {
  return new Date('9999-12-31T00:00:00.000Z');
}
