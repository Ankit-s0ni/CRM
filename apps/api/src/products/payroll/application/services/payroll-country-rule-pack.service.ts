import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayrollCountryPackStatus, Prisma } from '@prisma/client';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { parseDateOnly } from '../../domain/value-objects/effective-date-range';
import {
  CreatePayrollCountryRulePackDto,
  UpdatePayrollCountryRulePackStatusDto,
} from '../dto/payroll-country-rule-pack.dto';

type Actor = { tenantId: string; userId: string };

@Injectable()
export class PayrollCountryRulePackService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.payrollCountryRulePack.findMany({
        where: { OR: [{ tenantId }, { tenantId: null }] },
        orderBy: [{ countryCode: 'asc' }, { effectiveFrom: 'desc' }],
      }),
    }));
  }

  create(actor: Actor, dto: CreatePayrollCountryRulePackDto) {
    return this.prisma.forTenant(async (tx) => {
      const existing = await tx.payrollCountryRulePack.findFirst({
        where: {
          tenantId: actor.tenantId,
          countryCode: dto.countryCode,
          version: dto.version,
        },
      });
      if (existing) duplicatePack();
      const pack = await tx.payrollCountryRulePack.create({
        data: {
          tenantId: actor.tenantId,
          countryCode: dto.countryCode,
          version: dto.version,
          effectiveFrom: parseDateOnly(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo
            ? parseDateOnly(dto.effectiveTo)
            : undefined,
          metadata: json(dto.metadata ?? {}),
          createdBy: actor.userId,
        },
      });
      return { data: pack };
    });
  }

  updateStatus(
    actor: Actor,
    id: string,
    dto: UpdatePayrollCountryRulePackStatusDto,
  ) {
    return this.prisma.forTenant(async (tx) => {
      const pack = await requirePack(tx, actor.tenantId, id);
      if (dto.status === PayrollCountryPackStatus.ACTIVE) {
        assertApprovedCountryPackMetadata(pack.metadata);
        await tx.payrollCountryRulePack.updateMany({
          where: {
            tenantId: actor.tenantId,
            countryCode: pack.countryCode,
            id: { not: pack.id },
            status: PayrollCountryPackStatus.ACTIVE,
          },
          data: { status: PayrollCountryPackStatus.DISABLED },
        });
      }
      const updated = await tx.payrollCountryRulePack.update({
        where: { id: pack.id },
        data: { status: dto.status },
      });
      return { data: updated };
    });
  }
}

async function requirePack(
  tx: PrismaTransaction,
  tenantId: string,
  id: string,
) {
  const pack = await tx.payrollCountryRulePack.findFirst({
    where: { id, tenantId },
  });
  if (!pack) {
    throw new NotFoundException({
      code: 'PAYROLL_COUNTRY_RULE_PACK_NOT_FOUND',
      message: 'Payroll country rule pack was not found',
    });
  }
  return pack;
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function assertApprovedCountryPackMetadata(metadata: Prisma.JsonValue) {
  const value =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  if (
    typeof value.approvedSpecReference !== 'string' ||
    typeof value.goldenFixtureChecksum !== 'string'
  ) {
    throw new ConflictException({
      code: 'PAYROLL_COUNTRY_PACK_APPROVED_SPEC_REQUIRED',
      message:
        'Country packs can be activated only with approvedSpecReference and goldenFixtureChecksum metadata.',
    });
  }
}

function duplicatePack(): never {
  throw new ConflictException({
    code: 'PAYROLL_COUNTRY_RULE_PACK_ALREADY_EXISTS',
    message: 'A country rule pack already exists for this country and version.',
  });
}
