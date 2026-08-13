import { BadRequestException } from '@nestjs/common';
import { employeeTemporaryPassword } from './employee-temporary-password';

describe('employeeTemporaryPassword', () => {
  it('uses the normalized full name and first six national phone digits', () => {
    expect(employeeTemporaryPassword('Ankit Soni', '+91 7367904370')).toBe(
      'AnkitSoni736790',
    );
  });

  it('preserves unicode letters while removing name separators', () => {
    expect(employeeTemporaryPassword('مريم عبد الله', '+968 9212 3456')).toBe(
      'مريمعبدالله921234',
    );
  });

  it('rejects an invalid phone instead of creating unusable credentials', () => {
    expect(() => employeeTemporaryPassword('Ankit Soni', '123')).toThrow(
      BadRequestException,
    );
  });
});
