import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';

export type ManagerNode = {
  id: string;
  managerId: string | null;
};

export function normalizeEmployeeCode(value: string) {
  return value.trim().replace(/\s+/g, '-').toUpperCase();
}

export function normalizeEmployeeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new UnprocessableEntityException({
      code: 'INVALID_EMPLOYMENT_DATES',
      message: 'Employment date is invalid',
    });
  }
  return date;
}

export function assertEmploymentDates(
  joiningDate: Date,
  exitDate: Date | null,
) {
  if (exitDate && joiningDate > exitDate) {
    throw new UnprocessableEntityException({
      code: 'INVALID_EMPLOYMENT_DATES',
      message: 'Joining date cannot be after exit date',
    });
  }
}

export function assertCanTerminate(status: EmployeeStatus) {
  if (status === EmployeeStatus.TERMINATED) {
    throw new ConflictException({
      code: 'EMPLOYEE_ALREADY_TERMINATED',
      message: 'Employee is already terminated',
    });
  }
}

export function assertCanReactivate(status: EmployeeStatus) {
  if (status !== EmployeeStatus.TERMINATED) {
    throw new ConflictException({
      code: 'EMPLOYEE_NOT_TERMINATED',
      message: 'Only a terminated employee can be reactivated',
    });
  }
}

export function assertNoManagerCycle(
  employeeId: string,
  nextManagerId: string | null,
  employees: ManagerNode[],
) {
  if (!nextManagerId) return;

  if (employeeId === nextManagerId) {
    throwManagerCycle();
  }

  const managerById = new Map(
    employees.map((employee) => [employee.id, employee.managerId]),
  );
  const visited = new Set<string>();
  let currentId: string | null = nextManagerId;

  while (currentId) {
    if (currentId === employeeId || visited.has(currentId)) {
      throwManagerCycle();
    }
    visited.add(currentId);
    currentId = managerById.get(currentId) ?? null;
  }
}

function throwManagerCycle(): never {
  throw new ConflictException({
    code: 'MANAGER_CYCLE',
    message: 'Manager assignment would create a reporting cycle',
  });
}
