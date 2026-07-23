import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '../../../../../shared/database/prisma.service';
import { IShiftRepository } from '../domain/shift.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaShiftRepository implements IShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTransaction) {
    return tx || this.prisma;
  }

  async findMany(tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).shift.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).shift.findUnique({
      where: { id, tenantId },
    });
  }

  async findByIdWithCounts(id: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).shift.findUnique({
      where: { id, tenantId },
      include: {
        _count: {
          select: { rosters: true, defaultFor: true, appliedLogs: true },
        },
      },
    });
  }

  async create(data: Prisma.ShiftUncheckedCreateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).shift.create({ data });
  }

  async update(id: string, data: Prisma.ShiftUncheckedUpdateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).shift.update({ where: { id }, data });
  }

  async delete(id: string, tx?: PrismaTransaction) {
    await this.getClient(tx).shift.delete({ where: { id } });
  }

  async findByName(name: string, tenantId: string, excludeId?: string, tx?: PrismaTransaction) {
    const where: Prisma.ShiftWhereInput = {
      tenantId,
      name: { equals: name, mode: 'insensitive' },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.getClient(tx).shift.findFirst({ where });
  }

  async findFlexibleShift(tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).shift.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
