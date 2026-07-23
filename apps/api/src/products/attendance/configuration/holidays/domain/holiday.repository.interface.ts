import { TenantHoliday, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../../shared/database/prisma.service';

export interface IHolidayRepository {
  findMany(tenantId: string, tx?: PrismaTransaction): Promise<(TenantHoliday & { office: { officeName: string } | null })[]>;
  findById(id: string, tenantId: string, tx?: PrismaTransaction): Promise<TenantHoliday | null>;
  create(data: Prisma.TenantHolidayUncheckedCreateInput, tx?: PrismaTransaction): Promise<TenantHoliday>;
  update(id: string, data: Prisma.TenantHolidayUncheckedUpdateInput, tx?: PrismaTransaction): Promise<TenantHoliday>;
  delete(id: string, tx?: PrismaTransaction): Promise<void>;
  findUniqueHoliday(tenantId: string, date: string, officeId?: string, excludeId?: string, tx?: PrismaTransaction): Promise<TenantHoliday | null>;
}

export const IHolidayRepository = Symbol('IHolidayRepository');
