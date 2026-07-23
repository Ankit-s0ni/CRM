import { EmployeeShiftRoster, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../../shared/database/prisma.service';

export interface IRosterRepository {
  findMany(employeeId?: string, startDate?: string, endDate?: string, tx?: PrismaTransaction): Promise<(EmployeeShiftRoster & { shift: any, employee: any })[]>;
  findByEmployeeAndDate(employeeId: string, date: string, tx?: PrismaTransaction): Promise<(EmployeeShiftRoster & { shift: any }) | null>;
  findManyByEmployeesAndDateRange(employeeIds: string[], startDate: string, endDate: string, tx?: PrismaTransaction): Promise<EmployeeShiftRoster[]>;
  findManyByEmployeesAndDate(employeeIds: string[], date: string, tx?: PrismaTransaction): Promise<(EmployeeShiftRoster & { shift: any })[]>;
  findById(id: string, tx?: PrismaTransaction): Promise<EmployeeShiftRoster | null>;
  create(data: Prisma.EmployeeShiftRosterUncheckedCreateInput, tx?: PrismaTransaction): Promise<EmployeeShiftRoster>;
  createMany(data: Prisma.EmployeeShiftRosterCreateManyArgs, tx?: PrismaTransaction): Promise<{ count: number }>;
  delete(id: string, tx?: PrismaTransaction): Promise<void>;
  deleteMany(employeeIds: string[], startDate: string, endDate: string, tx?: PrismaTransaction): Promise<{ count: number }>;
}

export const IRosterRepository = Symbol('IRosterRepository');
