import { HttpException } from '@nestjs/common';
import {
  EMPLOYEE_IMPORT_HEADERS,
  EMPLOYEE_IMPORT_FIELDS,
  normalizeEmployeeImportRow,
  parseEmployeeCsv,
} from './employee-import-parser';

describe('employee import parser', () => {
  it('keeps the public import schema in the exact parser header order', () => {
    expect(EMPLOYEE_IMPORT_FIELDS.map(({ key }) => key)).toEqual([
      ...EMPLOYEE_IMPORT_HEADERS,
    ]);
    expect(
      EMPLOYEE_IMPORT_FIELDS.filter(({ required }) => required).map(
        ({ key }) => key,
      ),
    ).toEqual([
      'employee_code',
      'full_name',
      'work_type',
      'department',
      'date_of_joining',
    ]);
  });

  it('requires the exact header and normalizes manual employee fields', () => {
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n emp 1 ,  Test   Employee  ,+919876543210,office, Engineering , Engineer ,,2026-01-15\n`;
    const [row] = parseEmployeeCsv(csv);
    expect(normalizeEmployeeImportRow(row)).toEqual({
      employeeCode: 'EMP-1',
      fullName: 'Test Employee',
      phone: '+919876543210',
      workType: 'OFFICE',
      department: 'Engineering',
      designation: 'Engineer',
      managerEmployeeCode: null,
      dateOfJoining: '2026-01-15',
    });
  });

  it('rejects malformed headers and dates', () => {
    expect(() => parseEmployeeCsv('employee_code,full_name\n1,Test')).toThrow(
      HttpException,
    );
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\nEMP-1,Test Employee,,OFFICE,Engineering,,,2026-02-30\n`;
    const [row] = parseEmployeeCsv(csv);
    expect(() => normalizeEmployeeImportRow(row)).toThrow(HttpException);
  });
});
