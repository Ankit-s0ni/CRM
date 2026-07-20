import { RequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  NotEquals,
} from 'class-validator';

export class CreateLeavePolicyDto {
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(2, 50) leaveType!: string;
  @IsNumber() @Min(0) @Max(366) annualEntitlement!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(366) carryForwardLimit = 0;
  @IsOptional() @IsObject() accrualLogic?: Record<string, unknown>;
}

export class UpdateLeavePolicyDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsString() @Length(2, 50) leaveType?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(366) annualEntitlement?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(366) carryForwardLimit?: number;
  @IsOptional() @IsObject() accrualLogic?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateLeaveRequestDto {
  @IsUUID() policyId!: string;
  @IsDateString({ strict: true }) startDate!: string;
  @IsDateString({ strict: true }) endDate!: string;
  @IsOptional() @IsBoolean() halfDayStart = false;
  @IsOptional() @IsBoolean() halfDayEnd = false;
  @IsString() @Length(3, 1000) reason!: string;
}

export class LeaveDecisionDto {
  @IsString() @Length(1, 1000) comment!: string;
}

export class LeaveRequestQueryDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsEnum(RequestStatus) status?: RequestStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class LeaveBalanceQueryDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() policyId?: string;
}

export class AdjustLeaveBalanceDto {
  @IsNumber() @Min(-366) @Max(366) @NotEquals(0) days!: number;
  @IsString() @Length(3, 500) reason!: string;
}
