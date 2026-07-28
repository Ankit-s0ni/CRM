import { PosTaxType } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/database/prisma.service';
import { DEFAULT_UNITS } from '../domain/default-units';
import {
  DEFAULT_OUTLET_NAME,
  OMAN_TAX_RATES,
} from '../domain/oman-tax-defaults';

/**
 * Idempotent POS bootstrap for one tenant.
 *
 * Every write upserts on a natural key, so this is safe to re-run — which is what makes
 * `POST /pos/setup` a usable backfill for tenants that existed before POS shipped.
 *
 * Deliberately NOT hooked into module activation: `replaceTenantModules` is not the only
 * activation path (tenant creation writes `tenantModule` rows directly, and self-serve
 * signup never activates POS at all), it has set semantics that would force an
 * activate/deactivate asymmetry, and putting POS bootstrap knowledge in the control plane
 * is exactly what the module boundaries exist to prevent.
 */
export async function ensurePosTenantDefaults(
  tx: PrismaTransaction,
  tenantId: string,
) {
  for (const rate of OMAN_TAX_RATES) {
    const taxRate = await tx.posTaxRate.upsert({
      where: { tenantId_name: { tenantId, name: rate.name } },
      update: {},
      create: {
        tenantId,
        name: rate.name,
        rate: rate.rate,
        type: PosTaxType[rate.type],
      },
    });

    // Products are assigned a tax group, never a bare rate, so each default rate ships
    // wrapped in a same-named group.
    const taxGroup = await tx.posTaxGroup.upsert({
      where: { tenantId_name: { tenantId, name: rate.name } },
      update: {},
      create: { tenantId, name: rate.name },
    });

    await tx.posTaxGroupRate.upsert({
      where: {
        taxGroupId_taxRateId: {
          taxGroupId: taxGroup.id,
          taxRateId: taxRate.id,
        },
      },
      update: {},
      create: { tenantId, taxGroupId: taxGroup.id, taxRateId: taxRate.id },
    });
  }

  await tx.posOutlet.upsert({
    where: { tenantId_name: { tenantId, name: DEFAULT_OUTLET_NAME } },
    update: {},
    create: { tenantId, name: DEFAULT_OUTLET_NAME },
  });

  // Units are seeded in two passes because derived units reference a base unit by code.
  for (const unit of DEFAULT_UNITS) {
    await tx.posUnitOfMeasure.upsert({
      where: { tenantId_code: { tenantId, code: unit.code } },
      update: {},
      create: { tenantId, code: unit.code, name: unit.name },
    });
  }
  for (const unit of DEFAULT_UNITS) {
    if (!unit.baseCode || !unit.factor) continue;
    const base = await tx.posUnitOfMeasure.findUnique({
      where: { tenantId_code: { tenantId, code: unit.baseCode } },
      select: { id: true },
    });
    if (!base) continue;
    await tx.posUnitOfMeasure.update({
      where: { tenantId_code: { tenantId, code: unit.code } },
      data: { baseUnitId: base.id, conversionFactor: unit.factor },
    });
  }

  // The invoice sequence is its own row so a settings write never contends with the
  // SELECT ... FOR UPDATE taken on every checkout.
  await tx.posInvoiceSequence.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });

  return tx.posSettings.upsert({
    where: { tenantId },
    update: { initializedAt: new Date() },
    create: { tenantId, initializedAt: new Date() },
  });
}
