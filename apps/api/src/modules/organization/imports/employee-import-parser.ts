import { UnprocessableEntityException } from '@nestjs/common';
import { WorkType } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import {
  normalizeEmployeeCode,
  normalizeEmployeeName,
  parseDateOnly,
} from '../employee-rules';

export const EMPLOYEE_IMPORT_HEADERS = [
  'employee_code',
  'full_name',
  'phone',
  'work_type',
  'department',
  'designation',
  'manager_employee_code',
  'date_of_joining',
] as const;

export type EmployeeImportRawRow = Record<
  (typeof EMPLOYEE_IMPORT_HEADERS)[number],
  string
>;

export type NormalizedEmployeeImportRow = {
  employeeCode: string;
  fullName: string;
  phone: string | null;
  workType: WorkType;
  department: string;
  designation: string | null;
  managerEmployeeCode: string | null;
  dateOfJoining: string;
};

export function parseEmployeeCsv(content: string): EmployeeImportRawRow[] {
  let records: string[][];
  try {
    records = parse(content, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: false,
      trim: true,
    });
  } catch {
    throw invalidFile('CSV could not be parsed');
  }
  if (records.length === 0) throw invalidFile('CSV is empty');
  const header = records[0]?.map((value) => value.trim().toLowerCase()) ?? [];
  if (
    header.length !== EMPLOYEE_IMPORT_HEADERS.length ||
    !EMPLOYEE_IMPORT_HEADERS.every((value, index) => header[index] === value)
  ) {
    throw invalidFile(
      `CSV header must be: ${EMPLOYEE_IMPORT_HEADERS.join(',')}`,
    );
  }
  if (records.length - 1 > 5000) {
    throw invalidFile('CSV cannot contain more than 5000 employee rows');
  }

  return records
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        EMPLOYEE_IMPORT_HEADERS.map((headerName, index) => [
          headerName,
          values[index] ?? '',
        ]),
      ),
    ) as EmployeeImportRawRow[];
}

export function normalizeEmployeeImportRow(
  row: EmployeeImportRawRow,
): NormalizedEmployeeImportRow {
  const employeeCode = normalizeEmployeeCode(row.employee_code);
  const fullName = normalizeEmployeeName(row.full_name);
  if (!employeeCode || employeeCode.length > 30)
    throw rowError('INVALID_EMPLOYEE_CODE');
  if (fullName.length < 2 || fullName.length > 120)
    throw rowError('INVALID_FULL_NAME');
  const phone = row.phone || null;
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone))
    throw rowError('INVALID_PHONE');
  const workType = row.work_type.toUpperCase();
  if (!Object.values(WorkType).includes(workType as WorkType)) {
    throw rowError('INVALID_WORK_TYPE');
  }
  if (!row.department) throw rowError('DEPARTMENT_REQUIRED');
  parseDateOnly(row.date_of_joining);

  return {
    employeeCode,
    fullName,
    phone,
    workType: workType as WorkType,
    department: row.department.trim().replace(/\s+/g, ' '),
    designation: row.designation.trim().replace(/\s+/g, ' ') || null,
    managerEmployeeCode: row.manager_employee_code
      ? normalizeEmployeeCode(row.manager_employee_code)
      : null,
    dateOfJoining: row.date_of_joining,
  };
}

function invalidFile(message: string) {
  return new UnprocessableEntityException({
    code: 'IMPORT_FILE_INVALID',
    message,
  });
}

function rowError(code: string) {
  return new Error(code);
}
