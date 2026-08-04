import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollInputKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePayrollRunDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  payGroupId!: string;

  @ApiProperty({ example: '2026-07' })
  @Matches(/^\d{4}-\d{2}$/)
  periodKey!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  periodStart!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  periodEnd!: string;

  @ApiPropertyOptional({ minLength: 8, maxLength: 120 })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PayrollAttendanceSnapshotRowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ minimum: 0, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(31)
  payableDays!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 31 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(31)
  lossOfPayDays?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  overtimeMinutes?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}

export class ImportPayrollAttendanceSnapshotDto {
  @ApiProperty({ example: 'attendance-lock:2026-07' })
  @IsString()
  source!: string;

  @ApiProperty({ example: 'sha256:abcdef' })
  @IsString()
  checksum!: string;

  @ApiProperty({ example: 'attendance-lock-v1' })
  @IsString()
  sourceVersion!: string;

  @ApiProperty({ type: [PayrollAttendanceSnapshotRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollAttendanceSnapshotRowDto)
  rows!: PayrollAttendanceSnapshotRowDto[];
}

export class CreatePayrollRunInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ enum: PayrollInputKind })
  @IsEnum(PayrollInputKind)
  kind!: PayrollInputKind;

  @ApiProperty({ example: 'BONUS' })
  @Matches(/^[A-Z0-9_-]{2,60}$/)
  code!: string;

  @ApiPropertyOptional({ example: '125000' })
  @IsOptional()
  @Matches(/^-?\d+$/)
  amountMinor?: string;

  @ApiPropertyOptional({ example: 'OMR' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PreviewPayrollInputCsvDto {
  @ApiProperty({ example: 'payroll-inputs-2026-07.csv' })
  @IsString()
  @MaxLength(160)
  fileName!: string;

  @ApiProperty({
    description:
      'CSV with headers: employeeId,kind,code,amountMinor,currency,reason',
  })
  @IsString()
  @MaxLength(250_000)
  csvText!: string;
}

export class AcknowledgePayrollValidationIssueDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class PayrollRunResponseDto {
  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;
}

export class PayrollRunListResponseDto {
  @ApiProperty({ type: [Object] })
  data!: Record<string, unknown>[];
}
