import { BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function employeeTemporaryPassword(fullName: string, phone: string) {
  const normalizedName = fullName.replace(/[^\p{L}\p{N}]/gu, '');
  const nationalDigits = parsePhoneNumberFromString(phone)?.nationalNumber;

  if (!normalizedName) {
    throw new BadRequestException({
      code: 'EMPLOYEE_NAME_REQUIRED',
      message: 'A valid employee full name is required to create the login',
    });
  }
  if (!nationalDigits || nationalDigits.length < 6) {
    throw new BadRequestException({
      code: 'EMPLOYEE_PHONE_REQUIRED',
      message:
        'A valid employee phone number with at least six local digits is required to create the login',
    });
  }

  return `${normalizedName}${nationalDigits.slice(0, 6)}`;
}
