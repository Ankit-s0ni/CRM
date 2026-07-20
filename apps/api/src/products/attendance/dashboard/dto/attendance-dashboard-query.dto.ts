import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum DashboardEmployeeStatus {
  CLOCKED_IN = 'CLOCKED_IN',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  ON_FIELD = 'ON_FIELD',
  ON_BREAK = 'ON_BREAK',
  NOT_YET_IN = 'NOT_YET_IN',
  OFF = 'OFF',
}

export class AttendanceDashboardQueryDto {
  @ApiPropertyOptional({ example: '2026-07-17' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  officeId?: string;

  @ApiPropertyOptional({ enum: DashboardEmployeeStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeArray(value))
  @IsArray()
  @IsEnum(DashboardEmployeeStatus, { each: true })
  status?: DashboardEmployeeStatus[];

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 24 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

function normalizeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : [value];
}
