import { Injectable } from '@nestjs/common';
import { PayrollVersionStatus, Prisma } from '@prisma/client';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../../shared/database/prisma.service';
import { PayrollFoundationRepository } from '../../application/ports/payroll-foundation.repository';

@Injectable()
export class PrismaPayrollFoundationRepository implements PayrollFoundationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private run<T>(
    tx: PrismaTransaction | undefined,
    callback: (client: PrismaTransaction) => Promise<T>,
  ) {
    return tx ? callback(tx) : this.prisma.forTenant(callback);
  }

  findEmployee(tenantId: string, employeeId: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true, tenantId: true },
      }),
    );
  }

  getSettings(tenantId: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.payrollSettings.findUnique({ where: { tenantId } }),
    );
  }

  listPayGroups(tenantId: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.payGroup.findMany({
        where: { tenantId },
        orderBy: { code: 'asc' },
      }),
    );
  }

  findPayGroup(tenantId: string, id: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.payGroup.findFirst({ where: { id, tenantId } }),
    );
  }

  listPayGroupEmployees(
    tenantId: string,
    payGroupId: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.payGroupEmployeeAssignment.findMany({
        where: { tenantId, payGroupId },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              status: true,
            },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
    );
  }

  findPayComponent(tenantId: string, id: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.payComponent.findFirst({ where: { id, tenantId } }),
    );
  }

  findPayComponentByCode(
    tenantId: string,
    code: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.payComponent.findFirst({
        where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      }),
    );
  }

  listPayComponents(tenantId: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.payComponent.findMany({
        where: { tenantId },
        include: {
          versions: { orderBy: { version: 'desc' }, take: 1 },
        },
        orderBy: { code: 'asc' },
      }),
    );
  }

  listPayComponentVersions(
    tenantId: string,
    componentId: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.payComponentVersion.findMany({
        where: { tenantId, componentId },
        orderBy: { version: 'desc' },
      }),
    );
  }

  findPayComponentVersion(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.payComponentVersion.findFirst({
        where: { id, tenantId },
      }),
    );
  }

  findSalaryStructure(tenantId: string, id: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.salaryStructure.findFirst({
        where: { id, tenantId },
        include: {
          versions: {
            include: { components: { include: { componentVersion: true } } },
            orderBy: { version: 'desc' },
          },
        },
      }),
    );
  }

  findSalaryStructureByCode(
    tenantId: string,
    code: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.salaryStructure.findFirst({
        where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      }),
    );
  }

  listSalaryStructures(tenantId: string, tx?: PrismaTransaction) {
    return this.run(tx, (client) =>
      client.salaryStructure.findMany({
        where: { tenantId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        orderBy: { code: 'asc' },
      }),
    );
  }

  listSalaryStructureVersions(
    tenantId: string,
    structureId: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.salaryStructureVersion.findMany({
        where: { tenantId, structureId },
        include: { components: { include: { componentVersion: true } } },
        orderBy: { version: 'desc' },
      }),
    );
  }

  findSalaryStructureVersion(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.salaryStructureVersion.findFirst({
        where: { id, tenantId },
        include: { structure: true, components: true },
      }),
    );
  }

  findStructureComponent(
    tenantId: string,
    versionId: string,
    componentVersionId: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.salaryStructureVersionComponent.findFirst({
        where: {
          tenantId,
          salaryStructureVersionId: versionId,
          payComponentVersionId: componentVersionId,
        },
      }),
    );
  }

  getEmployeePayrollProfile(
    tenantId: string,
    employeeId: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.employeePayrollProfile.findFirst({
        where: { tenantId, employeeId },
        include: { payGroup: true },
      }),
    );
  }

  listEmployeeCompensations(
    tenantId: string,
    profileId: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.employeeCompensationVersion.findMany({
        where: { tenantId, employeePayrollProfileId: profileId },
        include: { salaryStructureVersion: { include: { structure: true } } },
        orderBy: { effectiveFrom: 'desc' },
      }),
    );
  }

  listPayrollPolicyVersions(
    tenantId: string,
    category: string,
    tx?: PrismaTransaction,
  ) {
    return this.run(tx, (client) =>
      client.payrollPolicyVersion.findMany({
        where: {
          tenantId,
          policy: { category: category as never },
          status: { in: ['ACTIVE', 'SCHEDULED'] },
        },
        include: { policy: true },
        orderBy: [{ sourceLevel: 'asc' }, { effectiveFrom: 'desc' }],
      }),
    );
  }

  createSettings(
    data: Prisma.PayrollSettingsUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payrollSettings.create({ data });
  }

  updateSettings(
    id: string,
    data: Prisma.PayrollSettingsUncheckedUpdateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payrollSettings.update({ where: { id }, data });
  }

  createPayGroup(
    data: Prisma.PayGroupUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payGroup.create({ data });
  }

  updatePayGroup(
    id: string,
    data: Prisma.PayGroupUncheckedUpdateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payGroup.update({ where: { id }, data });
  }

  createPayGroupAssignment(
    data: Prisma.PayGroupEmployeeAssignmentUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payGroupEmployeeAssignment.create({ data });
  }

  updatePayGroupAssignment(
    id: string,
    data: Prisma.PayGroupEmployeeAssignmentUncheckedUpdateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payGroupEmployeeAssignment.update({ where: { id }, data });
  }

  createPayComponent(
    data: Prisma.PayComponentUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payComponent.create({ data });
  }

  createPayComponentVersion(
    data: Prisma.PayComponentVersionUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.payComponentVersion.create({ data });
  }

  async activatePayComponentVersion(
    id: string,
    componentId: string,
    actorId: string,
    tx: PrismaTransaction,
  ) {
    await tx.payComponentVersion.updateMany({
      where: {
        componentId,
        status: PayrollVersionStatus.ACTIVE,
        id: { not: id },
      },
      data: { status: PayrollVersionStatus.RETIRED },
    });
    return tx.payComponentVersion.update({
      where: { id },
      data: {
        status: PayrollVersionStatus.ACTIVE,
        activatedAt: new Date(),
        activatedBy: actorId,
      },
    });
  }

  createSalaryStructure(
    data: Prisma.SalaryStructureUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.salaryStructure.create({ data });
  }

  createSalaryStructureVersion(
    data: Prisma.SalaryStructureVersionUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.salaryStructureVersion.create({ data });
  }

  async activateSalaryStructureVersion(
    id: string,
    structureId: string,
    actorId: string,
    tx: PrismaTransaction,
  ) {
    await tx.salaryStructureVersion.updateMany({
      where: {
        structureId,
        status: PayrollVersionStatus.ACTIVE,
        id: { not: id },
      },
      data: { status: PayrollVersionStatus.RETIRED },
    });
    return tx.salaryStructureVersion.update({
      where: { id },
      data: {
        status: PayrollVersionStatus.ACTIVE,
        activatedAt: new Date(),
        activatedBy: actorId,
      },
    });
  }

  addSalaryStructureComponent(
    data: Prisma.SalaryStructureVersionComponentUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.salaryStructureVersionComponent.create({ data });
  }

  async removeSalaryStructureComponent(id: string, tx: PrismaTransaction) {
    await tx.salaryStructureVersionComponent.delete({ where: { id } });
  }

  createEmployeePayrollProfile(
    data: Prisma.EmployeePayrollProfileUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.employeePayrollProfile.create({ data });
  }

  updateEmployeePayrollProfile(
    id: string,
    data: Prisma.EmployeePayrollProfileUncheckedUpdateInput,
    tx: PrismaTransaction,
  ) {
    return tx.employeePayrollProfile.update({ where: { id }, data });
  }

  createEmployeeCompensation(
    data: Prisma.EmployeeCompensationVersionUncheckedCreateInput,
    tx: PrismaTransaction,
  ) {
    return tx.employeeCompensationVersion.create({ data });
  }

  updateEmployeeCompensation(
    id: string,
    data: Prisma.EmployeeCompensationVersionUncheckedUpdateInput,
    tx: PrismaTransaction,
  ) {
    return tx.employeeCompensationVersion.update({ where: { id }, data });
  }
}
