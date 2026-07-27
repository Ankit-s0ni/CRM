/**
 * Oman VAT defaults provisioned for every POS tenant.
 *
 * Framework-free by design: this file must not import NestJS or Prisma. Rates are
 * strings so they cross into Decimal(5,3) without ever passing through a JS number.
 */
export type OmanTaxTypeKey = 'VAT' | 'ZERO_RATED' | 'EXEMPT' | 'OUT_OF_SCOPE';

export interface OmanTaxRateDefinition {
  /** Unique per tenant — used as the upsert key so provisioning stays idempotent. */
  readonly name: string;
  /** Percentage, not a fraction: 5% is '5.000'. */
  readonly rate: string;
  readonly type: OmanTaxTypeKey;
}

export const OMAN_TAX_RATES: readonly OmanTaxRateDefinition[] = [
  { name: 'Standard VAT 5%', rate: '5.000', type: 'VAT' },
  { name: 'Zero-Rated', rate: '0.000', type: 'ZERO_RATED' },
  { name: 'Exempt', rate: '0.000', type: 'EXEMPT' },
  { name: 'Out of Scope', rate: '0.000', type: 'OUT_OF_SCOPE' },
];

/**
 * Each default rate is wrapped in a same-named group, because products are assigned a
 * tax *group*, never a bare rate. Tenants can compose additional groups later.
 */
export const OMAN_TAX_GROUPS: readonly string[] = OMAN_TAX_RATES.map(
  (rate) => rate.name,
);

export const DEFAULT_OUTLET_NAME = 'Main Outlet';
