import { Injectable } from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { IEmployeeRepository } from '../domain/employee.repository.interface';
import { PrismaService, PrismaTransaction } from '../../../shared/database/prisma.service';

const EMPLOYEE_RELATIONS = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  manager: { select: { id: true, employeeCode: true, fullName: true } },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class PrismaEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EmployeeUncheckedCreateInput, tx?: PrismaTransaction): Promise<Employee> {
    const client = tx || this.prisma;
    return client.employee.create({
      data,
      include: EMPLOYEE_RELATIONS,
    });
  }
}
