import { UnprocessableEntityException } from '@nestjs/common';

const CURRENCY_SCALE: Record<string, number> = {
  INR: 2,
  AED: 2,
  OMR: 3,
  QAR: 2,
  SAR: 2,
  USD: 2,
};

export type GstBreakdown = {
  subtotalMinor: bigint;
  taxMinor: bigint;
  cgstMinor: bigint;
  sgstMinor: bigint;
  igstMinor: bigint;
  totalMinor: bigint;
  rateBasisPoints: number;
  intraState: boolean;
};

export function majorToMinor(value: string | number, currency: string): bigint {
  const normalizedCurrency = currency.toUpperCase();
  const scale = CURRENCY_SCALE[normalizedCurrency];
  if (scale === undefined) invalidMoney('Unsupported billing currency');
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) invalidMoney('Money must be nonnegative');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > scale)
    invalidMoney('Money has too many decimal places');
  return (
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'))
  );
}

export function minorToMajor(value: bigint, currency: string): string {
  const scale = CURRENCY_SCALE[currency.toUpperCase()];
  if (scale === undefined) invalidMoney('Unsupported billing currency');
  const divisor = 10n ** BigInt(scale);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(scale, '0');
  return scale ? `${whole}.${fraction}` : whole.toString();
}

export function calculateGst(
  subtotalMinor: bigint,
  supplierStateCode: string,
  customerStateCode: string | null,
  rateBasisPoints = 1800,
): GstBreakdown {
  if (subtotalMinor < 0n || rateBasisPoints < 0 || rateBasisPoints > 10_000)
    invalidMoney('Tax inputs are outside supported limits');
  const taxMinor = roundRatio(subtotalMinor * BigInt(rateBasisPoints), 10_000n);
  const intraState = Boolean(
    customerStateCode && customerStateCode === supplierStateCode,
  );
  const cgstMinor = intraState ? taxMinor / 2n : 0n;
  const sgstMinor = intraState ? taxMinor - cgstMinor : 0n;
  const igstMinor = intraState ? 0n : taxMinor;
  return {
    subtotalMinor,
    taxMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    totalMinor: subtotalMinor + taxMinor,
    rateBasisPoints,
    intraState,
  };
}

export function gstStateCode(gstin?: string | null): string | null {
  const value = gstin?.trim().toUpperCase();
  return value && /^[0-9]{2}[A-Z0-9]{13}$/.test(value)
    ? value.slice(0, 2)
    : null;
}

function roundRatio(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / 2n) / denominator;
}

function invalidMoney(message: string): never {
  throw new UnprocessableEntityException({
    code: 'BILLING_MONEY_INVALID',
    message,
  });
}
