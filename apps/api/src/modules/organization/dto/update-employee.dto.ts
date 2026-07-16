import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'EMP-0001' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  employeeCode?: string;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: '+919876543210', nullable: true })
  @IsOptional()
  @Matches(E164_PATTERN, { message: 'phone must be in E.164 format' })
  phone?: string | null;

  @ApiPropertyOptional({ enum: WorkType })
  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @ApiPropertyOptional({ example: '2026-07-16', format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'dateOfJoining must use YYYY-MM-DD',
  })
  dateOfJoining?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deptId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  designationId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  managerId?: string | null;

  @ApiPropertyOptional({ example: '2026-07-16', format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'effectiveDate must use YYYY-MM-DD',
  })
  effectiveDate?: string;
}
