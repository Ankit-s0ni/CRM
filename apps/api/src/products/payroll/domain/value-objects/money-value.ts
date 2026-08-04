import { UnprocessableEntityException } from '@nestjs/common';

const CURRENCY_SCALE: Record<string, number> = {
  BHD: 3,
  INR: 2,
  KWD: 3,
  OMR: 3,
  USD: 2,
};

export class MoneyValue {
  private constructor(
    readonly amountMinor: bigint,
    readonly currency: string,
  ) {}

  static fromMinor(amountMinor: string | number | bigint, currency: string) {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new UnprocessableEntityException({
        code: 'CURRENCY_MISMATCH',
        message: 'Currency must be an ISO 4217 code',
      });
    }
    if (!(normalizedCurrency in CURRENCY_SCALE)) {
      throw new UnprocessableEntityException({
        code: 'CURRENCY_MISMATCH',
        message: 'Currency is not supported for payroll foundation',
      });
    }
    const value = BigInt(amountMinor);
    if (value < 0n) {
      throw new UnprocessableEntityException({
        code: 'INVALID_MINOR_UNIT_SCALE',
        message: 'Money amount must be zero or greater',
      });
    }
    return new MoneyValue(value, normalizedCurrency);
  }

  static scaleFor(currency: string) {
    const normalizedCurrency = currency.trim().toUpperCase();
    const scale = CURRENCY_SCALE[normalizedCurrency];
    if (scale === undefined) {
      throw new UnprocessableEntityException({
        code: 'CURRENCY_MISMATCH',
        message: 'Currency is not supported for payroll foundation',
      });
    }
    return scale;
  }
}
