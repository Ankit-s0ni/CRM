import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../domain/office.repository.interface';
import { Prisma, OfficeLocation, EmployeeOfficeAssignment } from '@prisma/client';

@Injectable()
export class PrismaOfficeRepository implements IOfficeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTransaction) {
    return tx || this.prisma;
  }

  async findMany(tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).officeLocation.findMany({
      where: { tenantId },
      include: { _count: { select: { assignments: true, holidays: true } } },
      orderBy: { officeName: 'asc' },
    });
  }

  async findById(id: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).officeLocation.findUnique({
      where: { id, tenantId },
      include: {
        assignments: {
          include: {
            employee: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        holidays: { orderBy: { holidayDate: 'asc' } },
      },
    });
  }

  async findBasicById(id: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).officeLocation.findUnique({
      where: { id, tenantId },
      include: { _count: { select: { assignments: true, holidays: true } } },
    });
  }

  async create(data: Prisma.OfficeLocationUncheckedCreateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).officeLocation.create({ data });
  }

  async update(id: string, data: Prisma.OfficeLocationUncheckedUpdateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).officeLocation.update({ where: { id }, data });
  }

  async delete(id: string, tx?: PrismaTransaction) {
    await this.getClient(tx).officeLocation.delete({ where: { id } });
  }

  async findByName(name: string, tenantId: string, excludeId?: string, tx?: PrismaTransaction) {
    const where: Prisma.OfficeLocationWhereInput = {
      tenantId,
      officeName: { equals: name, mode: 'insensitive' },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.getClient(tx).officeLocation.findFirst({ where });
  }

  async findAssignmentsByOffice(officeId: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).employeeOfficeAssignment.findMany({
      where: { officeLocationId: officeId, tenantId },
      include: { employee: true },
      orderBy: { employee: { fullName: 'asc' } },
    });
  }

  async deleteAssignmentsByOffice(officeId: string, tenantId: string, tx?: PrismaTransaction) {
    await this.getClient(tx).employeeOfficeAssignment.deleteMany({
      where: { officeLocationId: officeId, tenantId },
    });
  }

  async createAssignments(data: Prisma.EmployeeOfficeAssignmentUncheckedCreateInput[], tx?: PrismaTransaction) {
    await this.getClient(tx).employeeOfficeAssignment.createMany({ data });
  }

  async countVerificationLogs(officeId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).attendanceVerificationLog.count({
      where: { matchedOfficeId: officeId },
    });
  }
}
