import {
  EmployeePayrollProfile,
  PayComponent,
  PayComponentVersion,
  PayGroup,
  PayGroupEmployeeAssignment,
  PayrollSettings,
  PayrollPolicy,
  PayrollPolicyVersion,
  Prisma,
  SalaryStructure,
  SalaryStructureVersion,
  SalaryStructureVersionComponent,
} from '@prisma/client';
import type { PrismaTransaction } from '../../../../shared/database/prisma.service';

export type PayrollFoundationReader = {
  findEmployee(
    tenantId: string,
    employeeId: string,
    tx?: PrismaTransaction,
  ): Promise<{ id: string; tenantId: string } | null>;
  getSettings(
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<PayrollSettings | null>;
  listPayGroups(tenantId: string, tx?: PrismaTransaction): Promise<PayGroup[]>;
  findPayGroup(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ): Promise<PayGroup | null>;
  listPayGroupEmployees(
    tenantId: string,
    payGroupId: string,
    tx?: PrismaTransaction,
  ): Promise<PayGroupEmployeeAssignment[]>;
  findPayComponent(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ): Promise<PayComponent | null>;
  findPayComponentByCode(
    tenantId: string,
    code: string,
    tx?: PrismaTransaction,
  ): Promise<PayComponent | null>;
  listPayComponents(
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<PayComponent[]>;
  listPayComponentVersions(
    tenantId: string,
    componentId: string,
    tx?: PrismaTransaction,
  ): Promise<PayComponentVersion[]>;
  findPayComponentVersion(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ): Promise<PayComponentVersion | null>;
  findSalaryStructure(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ): Promise<SalaryStructure | null>;
  findSalaryStructureByCode(
    tenantId: string,
    code: string,
    tx?: PrismaTransaction,
  ): Promise<SalaryStructure | null>;
  listSalaryStructures(
    tenantId: string,
    tx?: PrismaTransaction,
  ): Promise<SalaryStructure[]>;
  listSalaryStructureVersions(
    tenantId: string,
    structureId: string,
    tx?: PrismaTransaction,
  ): Promise<SalaryStructureVersion[]>;
  findSalaryStructureVersion(
    tenantId: string,
    id: string,
    tx?: PrismaTransaction,
  ): Promise<Prisma.SalaryStructureVersionGetPayload<{
    include: { structure: true; components: true };
  }> | null>;
  findStructureComponent(
    tenantId: string,
    versionId: string,
    componentVersionId: string,
    tx?: PrismaTransaction,
  ): Promise<SalaryStructureVersionComponent | null>;
  getEmployeePayrollProfile(
    tenantId: string,
    employeeId: string,
    tx?: PrismaTransaction,
  ): Promise<EmployeePayrollProfile | null>;
  listPayrollPolicyVersions(
    tenantId: string,
    category: string,
    tx?: PrismaTransaction,
  ): Promise<Array<PayrollPolicyVersion & { policy: PayrollPolicy }>>;
  listEmployeeCompensations(
    tenantId: string,
    profileId: string,
    tx?: PrismaTransaction,
  ): Promise<
    Array<
      Prisma.EmployeeCompensationVersionGetPayload<{
        include: { salaryStructureVersion: { include: { structure: true } } };
      }>
    >
  >;
};

export type PayrollFoundationWriter = {
  createSettings(
    data: Prisma.PayrollSettingsUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<PayrollSettings>;
  updateSettings(
    id: string,
    data: Prisma.PayrollSettingsUncheckedUpdateInput,
    tx: PrismaTransaction,
  ): Promise<PayrollSettings>;
  createPayGroup(
    data: Prisma.PayGroupUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<PayGroup>;
  updatePayGroup(
    id: string,
    data: Prisma.PayGroupUncheckedUpdateInput,
    tx: PrismaTransaction,
  ): Promise<PayGroup>;
  createPayGroupAssignment(
    data: Prisma.PayGroupEmployeeAssignmentUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<PayGroupEmployeeAssignment>;
  updatePayGroupAssignment(
    id: string,
    data: Prisma.PayGroupEmployeeAssignmentUncheckedUpdateInput,
    tx: PrismaTransaction,
  ): Promise<PayGroupEmployeeAssignment>;
  createPayComponent(
    data: Prisma.PayComponentUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<PayComponent>;
  createPayComponentVersion(
    data: Prisma.PayComponentVersionUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<PayComponentVersion>;
  activatePayComponentVersion(
    id: string,
    componentId: string,
    actorId: string,
    tx: PrismaTransaction,
  ): Promise<PayComponentVersion>;
  createSalaryStructure(
    data: Prisma.SalaryStructureUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<SalaryStructure>;
  createSalaryStructureVersion(
    data: Prisma.SalaryStructureVersionUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<SalaryStructureVersion>;
  activateSalaryStructureVersion(
    id: string,
    structureId: string,
    actorId: string,
    tx: PrismaTransaction,
  ): Promise<SalaryStructureVersion>;
  addSalaryStructureComponent(
    data: Prisma.SalaryStructureVersionComponentUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<SalaryStructureVersionComponent>;
  removeSalaryStructureComponent(
    id: string,
    tx: PrismaTransaction,
  ): Promise<void>;
  createEmployeePayrollProfile(
    data: Prisma.EmployeePayrollProfileUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<EmployeePayrollProfile>;
  updateEmployeePayrollProfile(
    id: string,
    data: Prisma.EmployeePayrollProfileUncheckedUpdateInput,
    tx: PrismaTransaction,
  ): Promise<EmployeePayrollProfile>;
  createEmployeeCompensation(
    data: Prisma.EmployeeCompensationVersionUncheckedCreateInput,
    tx: PrismaTransaction,
  ): Promise<unknown>;
  updateEmployeeCompensation(
    id: string,
    data: Prisma.EmployeeCompensationVersionUncheckedUpdateInput,
    tx: PrismaTransaction,
  ): Promise<unknown>;
};

export type PayrollFoundationRepository = PayrollFoundationReader &
  PayrollFoundationWriter;

export const PAYROLL_FOUNDATION_REPOSITORY = Symbol(
  'PAYROLL_FOUNDATION_REPOSITORY',
);
