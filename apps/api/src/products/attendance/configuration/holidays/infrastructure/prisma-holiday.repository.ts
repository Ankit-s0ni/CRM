import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '../../../../../shared/database/prisma.service';
import { IHolidayRepository } from '../domain/holiday.repository.interface';
import { Prisma } from '@prisma/client';
import { dateOnly } from '../../attendance-config.rules';

@Injectable()
export class PrismaHolidayRepository implements IHolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTransaction) {
    return tx || this.prisma;
  }

  async findMany(tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).tenantHoliday.findMany({
      where: { tenantId },
      include: { office: { select: { officeName: true } } },
      orderBy: { holidayDate: 'asc' },
    });
  }

  async findById(id: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).tenantHoliday.findUnique({
      where: { id, tenantId },
    });
  }

  async create(data: Prisma.TenantHolidayUncheckedCreateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).tenantHoliday.create({ data });
  }

  async update(id: string, data: Prisma.TenantHolidayUncheckedUpdateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).tenantHoliday.update({ where: { id }, data });
  }

  async delete(id: string, tx?: PrismaTransaction) {
    await this.getClient(tx).tenantHoliday.delete({ where: { id } });
  }

  async findUniqueHoliday(tenantId: string, date: string, officeId?: string, excludeId?: string, tx?: PrismaTransaction) {
    const where: Prisma.TenantHolidayWhereInput = {
      tenantId,
      holidayDate: dateOnly(date),
      officeLocationId: officeId ?? null,
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.getClient(tx).tenantHoliday.findFirst({ where });
  }
}
