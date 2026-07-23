import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../domain/roster.repository.interface';
import { Prisma } from '@prisma/client';
import { dateOnly } from '../../attendance-config.rules';

@Injectable()
export class PrismaRosterRepository implements IRosterRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTransaction) {
    return tx || this.prisma;
  }

  async findMany(employeeId?: string, startDate?: string, endDate?: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.findMany({
      where: {
        employeeId,
        rosterDate:
          startDate || endDate
            ? {
                gte: startDate ? dateOnly(startDate) : undefined,
                lte: endDate ? dateOnly(endDate) : undefined,
              }
            : undefined,
      },
      include: {
        shift: true,
        employee: {
          select: { id: true, employeeCode: true, fullName: true },
        },
      },
      orderBy: [{ rosterDate: 'asc' }, { employee: { fullName: 'asc' } }],
    });
  }

  async findByEmployeeAndDate(employeeId: string, date: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.findFirst({
      where: { employeeId, rosterDate: dateOnly(date) },
      include: { shift: true },
    });
  }

  async findManyByEmployeesAndDateRange(employeeIds: string[], startDate: string, endDate: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.findMany({
      where: {
        employeeId: { in: employeeIds },
        rosterDate: { gte: dateOnly(startDate), lte: dateOnly(endDate) },
      },
    });
  }

  async findManyByEmployeesAndDate(employeeIds: string[], date: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.findMany({
      where: {
        employeeId: { in: employeeIds },
        rosterDate: dateOnly(date),
      },
      include: { shift: true },
    });
  }

  async findById(id: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.findUnique({ where: { id } });
  }

  async create(data: Prisma.EmployeeShiftRosterUncheckedCreateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.create({ data });
  }

  async createMany(args: Prisma.EmployeeShiftRosterCreateManyArgs, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.createMany(args);
  }

  async delete(id: string, tx?: PrismaTransaction) {
    await this.getClient(tx).employeeShiftRoster.delete({ where: { id } });
  }

  async deleteMany(employeeIds: string[], startDate: string, endDate: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeShiftRoster.deleteMany({
      where: {
        employeeId: { in: employeeIds },
        rosterDate: { gte: dateOnly(startDate), lte: dateOnly(endDate) },
      },
    });
  }
}
