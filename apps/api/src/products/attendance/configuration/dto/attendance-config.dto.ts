import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AttendanceLocationMode, SelfieMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateOfficeDto {
  @IsString() @MinLength(2) @MaxLength(100) officeName!: string;
  @Type(() => Number) @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @Min(-180) @Max(180) longitude!: number;
  @IsInt() @Min(25) @Max(10_000) radiusMeters!: number;
  @IsOptional() @IsString() @MaxLength(100) timezone?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsOptional() @Matches(/^[A-Z]{2}-[A-Z0-9]{1,12}$/) subdivisionCode?: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  egressIps?: string[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  wifiSsids?: string[];
}
export class UpdateOfficeDto extends PartialType(CreateOfficeDto) {}

export class AssignOfficeEmployeesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  employeeIds!: string[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  primaryEmployeeIds?: string[];
}

export class CreatePolicyDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsInt() @Min(0) @Max(1440) lateAfterMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) halfDayAfterMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) minimumWorkMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1440) overtimeAfterMinutes?: number;
  @IsOptional() @IsBoolean() allowEarlyCheckin?: boolean;
  @IsOptional() @IsBoolean() allowEarlyCheckout?: boolean;
  @IsOptional() @IsBoolean() requireFaceMatch?: boolean;
  @IsOptional() @IsBoolean() allowBiometricOptOut?: boolean;
  @IsOptional() @IsBoolean() requireRegisteredDevice?: boolean;
  @IsOptional() @IsBoolean() requireGeofence?: boolean;
  @ApiPropertyOptional({ enum: AttendanceLocationMode })
  @IsOptional()
  @IsEnum(AttendanceLocationMode)
  locationMode?: AttendanceLocationMode;
  @ApiPropertyOptional({ enum: SelfieMode })
  @IsOptional()
  @IsEnum(SelfieMode)
  selfieMode?: SelfieMode;
  @IsOptional() @IsBoolean() fieldTrackingEnabled?: boolean;
  @IsOptional() @IsBoolean() allowHybridFieldTracking?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(168) maxOfflineSyncHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) maxFaceAttempts?: number;
  @IsOptional() weeklyOffs?: unknown;
  @IsOptional() @IsObject() breakRules?: Record<string, unknown>;
}
export class UpdatePolicyDto extends PartialType(CreatePolicyDto) {}

export class PolicyAssignmentDto {
  @IsIn(['TENANT_DEFAULT', 'DEPARTMENT', 'EMPLOYEE']) scope!:
    'TENANT_DEFAULT' | 'DEPARTMENT' | 'EMPLOYEE';
  @IsOptional() @IsUUID() deptId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
}
export class ReplacePolicyAssignmentsDto {
  @IsArray() @ArrayMaxSize(501) assignments!: PolicyAssignmentDto[];
}

export class AssignEmployeePolicyDto {
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description:
      'Direct policy override. Use null to inherit department or tenant policy.',
  })
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  policyId!: string | null;
}

export class CreateShiftDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime!: string;
}
export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

export class CreateRosterDto {
  @IsUUID() employeeId!: string;
  @IsUUID() shiftId!: string;
  @IsDateString({ strict: true }) rosterDate!: string;
}

export class BulkRosterDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  employeeIds!: string[];
  @IsUUID() shiftId!: string;
  @IsDateString({ strict: true }) startDate!: string;
  @IsDateString({ strict: true }) endDate!: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  weekdays?: number[];
}

export class RosterQueryDto {
  @IsOptional() @IsDateString({ strict: true }) startDate?: string;
  @IsOptional() @IsDateString({ strict: true }) endDate?: string;
  @IsOptional() @IsUUID() employeeId?: string;
}

export class BulkResolveDto {
  @ApiProperty({ type: [String], maxItems: 500 })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  employeeIds!: string[];

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString({ strict: true })
  date!: string;
}

export class CreateHolidayDto {
  @IsString() @MinLength(2) @MaxLength(120) holidayName!: string;
  @IsDateString({ strict: true }) holidayDate!: string;
  @IsOptional() @IsUUID() officeLocationId?: string;
}
export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class SyncPublicHolidaysDto {
  @IsOptional() @IsUUID() officeLocationId?: string;
  @IsOptional() @IsInt() @Min(2020) @Max(2100) year?: number;
}

export class RosterImportPresignDto {
  @ApiProperty({ example: 'rosters.csv' })
  @IsString()
  @MaxLength(160)
  filename!: string;
  @ApiPropertyOptional({ default: 'text/csv' })
  @IsOptional()
  @IsIn(['text/csv', 'application/vnd.ms-excel'])
  contentType?: string;
}

export class CreateRosterImportDto {
  @IsString() objectKey!: string;
  @IsString() @MaxLength(160) originalFilename!: string;
  @IsString() @MinLength(8) @MaxLength(100) idempotencyKey!: string;
}
