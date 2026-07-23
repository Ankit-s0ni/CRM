import { AttendancePolicy, PolicyAssignment, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../../shared/database/prisma.service';

export interface IPolicyRepository {
  findMany(tenantId: string, tx?: PrismaTransaction): Promise<(AttendancePolicy & { assignments: PolicyAssignment[] })[]>;
  findById(id: string, tenantId: string, tx?: PrismaTransaction): Promise<(AttendancePolicy & { _count?: { assignments: number }, assignments?: PolicyAssignment[] }) | null>;
  findByName(name: string, tenantId: string, excludeId?: string, tx?: PrismaTransaction): Promise<AttendancePolicy | null>;
  create(data: Prisma.AttendancePolicyUncheckedCreateInput, tx?: PrismaTransaction): Promise<AttendancePolicy>;
  update(id: string, data: Prisma.AttendancePolicyUncheckedUpdateInput, tx?: PrismaTransaction): Promise<AttendancePolicy>;
  delete(id: string, tx?: PrismaTransaction): Promise<void>;
  
  findAssignmentsByPolicy(policyId: string, tx?: PrismaTransaction): Promise<PolicyAssignment[]>;
  deleteAssignmentsByPolicy(policyId: string, tx?: PrismaTransaction): Promise<void>;
  deleteAssignmentsByEmployee(employeeId: string, tx?: PrismaTransaction): Promise<void>;
  createAssignments(data: Prisma.PolicyAssignmentCreateManyArgs, tx?: PrismaTransaction): Promise<{ count: number }>;
  createAssignment(data: Prisma.PolicyAssignmentUncheckedCreateInput, tx?: PrismaTransaction): Promise<PolicyAssignment>;
  findEmployeeAssignments(employeeId: string, tx?: PrismaTransaction): Promise<PolicyAssignment[]>;
  findAssignmentsForResolution(employeeIds: string[], deptIds: string[], tx?: PrismaTransaction): Promise<(PolicyAssignment & { policy: any })[]>;
}

export const IPolicyRepository = Symbol('IPolicyRepository');
