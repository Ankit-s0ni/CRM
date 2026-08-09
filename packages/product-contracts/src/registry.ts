import type { ProductAudience, ProductKey } from './contracts';
import { HRMS_PERMISSIONS } from './hrms';

export const PRODUCT_AUDIENCE_BY_KEY = {
  HRMS: 'hrms-api',
  MAIL: 'mail-api',
  POS: 'pos-api',
} as const satisfies Record<ProductKey, ProductAudience>;

export const PRODUCT_CAPABILITY_KEYS = {
  HRMS: [
    'HRMS_EMPLOYEES',
    'HRMS_ORGANIZATION',
    'HRMS_ATTENDANCE',
    'HRMS_LEAVE',
    'HRMS_PAYROLL',
    'HRMS_DOCUMENTS',
  ],
  MAIL: [],
  POS: [],
} as const satisfies Record<ProductKey, readonly string[]>;

export const PRODUCT_PERMISSION_KEYS = {
  HRMS: Object.values(HRMS_PERMISSIONS),
  MAIL: [],
  POS: [],
} as const satisfies Record<ProductKey, readonly string[]>;

export function productForAudience(audience: ProductAudience): ProductKey {
  const entry = Object.entries(PRODUCT_AUDIENCE_BY_KEY).find(
    ([, registeredAudience]) => registeredAudience === audience,
  );
  if (!entry) throw new Error(`No product is registered for audience ${audience}`);
  return entry[0] as ProductKey;
}
