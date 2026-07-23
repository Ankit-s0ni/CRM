import { OfficeLocation, EmployeeOfficeAssignment, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../../shared/database/prisma.service';

export interface IOfficeRepository {
  findMany(tenantId: string, tx?: PrismaTransaction): Promise<(OfficeLocation & { _count: { assignments: number; holidays: number } })[]>;
  findById(id: string, tenantId: string, tx?: PrismaTransaction): Promise<(OfficeLocation & {
    assignments: (EmployeeOfficeAssignment & { employee: { id: string; employeeCode: string; fullName: string } })[];
    holidays: any[];
  }) | null>;
  findBasicById(id: string, tenantId: string, tx?: PrismaTransaction): Promise<(OfficeLocation & { _count?: { assignments: number; holidays: number } }) | null>;
  create(data: Prisma.OfficeLocationUncheckedCreateInput, tx?: PrismaTransaction): Promise<OfficeLocation>;
  update(id: string, data: Prisma.OfficeLocationUncheckedUpdateInput, tx?: PrismaTransaction): Promise<OfficeLocation>;
  delete(id: string, tx?: PrismaTransaction): Promise<void>;
  findByName(name: string, tenantId: string, excludeId?: string, tx?: PrismaTransaction): Promise<OfficeLocation | null>;
  
  // Assignment methods
  findAssignmentsByOffice(officeId: string, tenantId: string, tx?: PrismaTransaction): Promise<(EmployeeOfficeAssignment & { employee: any })[]>;
  deleteAssignmentsByOffice(officeId: string, tenantId: string, tx?: PrismaTransaction): Promise<void>;
  createAssignments(data: Prisma.EmployeeOfficeAssignmentUncheckedCreateInput[], tx?: PrismaTransaction): Promise<void>;

  // Integrity checks
  countVerificationLogs(officeId: string, tx?: PrismaTransaction): Promise<number>;
}

export const IOfficeRepository = Symbol('IOfficeRepository');
