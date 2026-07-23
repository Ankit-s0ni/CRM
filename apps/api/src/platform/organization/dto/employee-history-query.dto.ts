import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const EMPLOYEE_HISTORY_CATEGORIES = [
  'LIFECYCLE',
  'PROFILE',
  'ACCESS',
  'ASSIGNMENT',
  'ATTENDANCE',
  'LEAVE',
  'TRUST',
  'DOCUMENT',
  'SECURITY',
] as const;

export type EmployeeHistoryCategory =
  (typeof EMPLOYEE_HISTORY_CATEGORIES)[number];

export class EmployeeHistoryQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsIn(EMPLOYEE_HISTORY_CATEGORIES)
  category?: EmployeeHistoryCategory;
}
