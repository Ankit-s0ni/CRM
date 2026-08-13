import type { AuthenticatedUser } from '../http/authenticated-user';

export const PRODUCT_READINESS_PORT = Symbol('PRODUCT_READINESS_PORT');

export type ProductSetupHealthCategory = {
  key: string;
  status: 'READY' | 'NEEDS_SETUP';
  configuration: Record<string, number>;
};

export type ProductSetupHealth = {
  categories: ProductSetupHealthCategory[];
};

export interface ProductReadinessPort {
  getSetupHealth(
    user: AuthenticatedUser,
    productKey: string,
  ): Promise<ProductSetupHealth>;
}
