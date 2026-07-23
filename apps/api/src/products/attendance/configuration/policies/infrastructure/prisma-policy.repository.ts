import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '../../../../../shared/database/prisma.service';
import { IPolicyRepository } from '../domain/policy.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaPolicyRepository implements IPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTransaction) {
    return tx || this.prisma;
  }

  async findMany(tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).attendancePolicy.findMany({
      where: { tenantId },
      include: { assignments: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, tenantId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).attendancePolicy.findUnique({
      where: { id, tenantId },
      include: { assignments: true, _count: { select: { assignments: true } } },
    });
  }

  async findByName(name: string, tenantId: string, excludeId?: string, tx?: PrismaTransaction) {
    const where: Prisma.AttendancePolicyWhereInput = {
      tenantId,
      name: { equals: name, mode: 'insensitive' },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.getClient(tx).attendancePolicy.findFirst({ where });
  }

  async create(data: Prisma.AttendancePolicyUncheckedCreateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).attendancePolicy.create({ data });
  }

  async update(id: string, data: Prisma.AttendancePolicyUncheckedUpdateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).attendancePolicy.update({ where: { id }, data });
  }

  async delete(id: string, tx?: PrismaTransaction) {
    await this.getClient(tx).attendancePolicy.delete({ where: { id } });
  }

  async findAssignmentsByPolicy(policyId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).policyAssignment.findMany({ where: { policyId } });
  }

  async deleteAssignmentsByPolicy(policyId: string, tx?: PrismaTransaction) {
    await this.getClient(tx).policyAssignment.deleteMany({ where: { policyId } });
  }

  async deleteAssignmentsByEmployee(employeeId: string, tx?: PrismaTransaction) {
    await this.getClient(tx).policyAssignment.deleteMany({ where: { scope: 'EMPLOYEE', employeeId } });
  }

  async createAssignments(args: Prisma.PolicyAssignmentCreateManyArgs, tx?: PrismaTransaction) {
    return this.getClient(tx).policyAssignment.createMany(args);
  }

  async createAssignment(data: Prisma.PolicyAssignmentUncheckedCreateInput, tx?: PrismaTransaction) {
    return this.getClient(tx).policyAssignment.create({ data });
  }

  async findEmployeeAssignments(employeeId: string, tx?: PrismaTransaction) {
    return this.getClient(tx).policyAssignment.findMany({ where: { scope: 'EMPLOYEE', employeeId } });
  }

  async findAssignmentsForResolution(employeeIds: string[], deptIds: string[], tx?: PrismaTransaction) {
    return this.getClient(tx).policyAssignment.findMany({
      where: {
        OR: [
          { scope: 'EMPLOYEE', employeeId: { in: employeeIds } },
          { scope: 'DEPARTMENT', deptId: { in: deptIds } },
          { scope: 'TENANT_DEFAULT' },
        ],
      },
      include: { policy: true },
    });
  }
}
