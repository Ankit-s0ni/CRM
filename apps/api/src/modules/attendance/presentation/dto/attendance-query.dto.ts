import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AttendanceStatus, ExceptionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
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

export class AttendanceRegisterQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  officeId?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsEnum(ExceptionType)
  exceptionType?: ExceptionType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class AttendanceMonthQueryDto {
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}

export class AttendanceDayQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}

export class AttendanceExceptionQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsEnum(ExceptionType)
  exceptionType?: ExceptionType;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export enum ManualAttendanceExceptionType {
  ON_DUTY = 'ON_DUTY',
  WFH = 'WFH',
  OTHER = 'OTHER',
}

export class CreateAttendanceExceptionDto {
  @IsUUID()
  employeeId!: string;

  @IsEnum(ManualAttendanceExceptionType)
  exceptionType!: ManualAttendanceExceptionType;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class UpdateAttendanceExceptionDto extends PartialType(
  CreateAttendanceExceptionDto,
) {}
