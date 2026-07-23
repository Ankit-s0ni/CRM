import { Employee, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../shared/database/prisma.service';

export interface IEmployeeRepository {
  create(data: Prisma.EmployeeUncheckedCreateInput, tx?: PrismaTransaction): Promise<Employee>;
}

export const IEmployeeRepository = Symbol('IEmployeeRepository');
