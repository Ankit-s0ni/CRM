import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  PayrollFrequency,
  PayrollPaymentMethod,
  PayrollPolicyCategory,
  PayrollPolicySourceLevel,
  PayrollProtectedDetailStatus,
  PayrollRecordStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CostCenterRuleDto,
  MetadataDto,
  PayrollPayoutDateRuleDto,
  PayrollPeriodRuleDto,
  PayrollPolicyConfigDto,
} from './payroll-configuration.dto';

export class CreatePayrollCalendarDto {
  @ApiProperty({ example: 'MONTHLY_26_25', pattern: '^[A-Z0-9_-]{2,40}$' })
  @Matches(/^[A-Z0-9_-]{2,40}$/)
  code!: string;
  @ApiProperty({ example: 'Monthly 26 to 25', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiProperty({ enum: PayrollFrequency })
  @IsEnum(PayrollFrequency)
  frequency!: PayrollFrequency;
  @ApiProperty({ type: PayrollPeriodRuleDto })
  @ValidateNested()
  @Type(() => PayrollPeriodRuleDto)
  periodStartRule!: PayrollPeriodRuleDto;
  @ApiProperty({ type: PayrollPeriodRuleDto })
  @ValidateNested()
  @Type(() => PayrollPeriodRuleDto)
  periodEndRule!: PayrollPeriodRuleDto;
  @ApiProperty({ type: PayrollPayoutDateRuleDto })
  @ValidateNested()
  @Type(() => PayrollPayoutDateRuleDto)
  payoutDateRule!: PayrollPayoutDateRuleDto;
  @ApiProperty({ example: 'Asia/Muscat', minLength: 3, maxLength: 80 })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  timezone!: string;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class UpdatePayrollCalendarDto extends PartialType(
  CreatePayrollCalendarDto,
) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}

export class CreatePayrollCalendarVersionDto {
  @ApiProperty({ example: 'Monthly 26 to 25', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiProperty({ enum: PayrollFrequency })
  @IsEnum(PayrollFrequency)
  frequency!: PayrollFrequency;
  @ApiProperty({ type: PayrollPeriodRuleDto })
  @ValidateNested()
  @Type(() => PayrollPeriodRuleDto)
  periodStartRule!: PayrollPeriodRuleDto;
  @ApiProperty({ type: PayrollPeriodRuleDto })
  @ValidateNested()
  @Type(() => PayrollPeriodRuleDto)
  periodEndRule!: PayrollPeriodRuleDto;
  @ApiProperty({ type: PayrollPayoutDateRuleDto })
  @ValidateNested()
  @Type(() => PayrollPayoutDateRuleDto)
  payoutDateRule!: PayrollPayoutDateRuleDto;
  @ApiProperty({ example: 'Asia/Muscat', minLength: 3, maxLength: 80 })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  timezone!: string;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class CreatePayrollPolicyDto {
  @ApiProperty({ example: 'PRORATION_DEFAULT', pattern: '^[A-Z0-9_-]{2,40}$' })
  @Matches(/^[A-Z0-9_-]{2,40}$/)
  code!: string;
  @ApiProperty({ example: 'Default proration', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiProperty({ enum: PayrollPolicyCategory })
  @IsEnum(PayrollPolicyCategory)
  category!: PayrollPolicyCategory;
}

export class UpdatePayrollPolicyDto extends PartialType(
  CreatePayrollPolicyDto,
) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}

export class CreatePayrollPolicyVersionDto {
  @ApiPropertyOptional({ enum: PayrollPolicySourceLevel })
  @IsOptional()
  @IsEnum(PayrollPolicySourceLevel)
  sourceLevel?: PayrollPolicySourceLevel;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sourceEntityId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  supportsOverrides?: boolean;
  @ApiProperty({ type: PayrollPolicyConfigDto })
  @ValidateNested()
  @Type(() => PayrollPolicyConfigDto)
  config!: PayrollPolicyConfigDto;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class UpsertEmployeePaymentDetailDto {
  @ApiProperty({ enum: PayrollPaymentMethod })
  @IsEnum(PayrollPaymentMethod)
  paymentMethod!: PayrollPaymentMethod;
  @ApiPropertyOptional({ maxLength: 120, example: 'Bank Muscat' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;
  @ApiPropertyOptional({ maxLength: 120, example: 'Payroll User' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountHolderName?: string;
  @ApiPropertyOptional({ maxLength: 80, writeOnly: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountNumber?: string;
  @ApiPropertyOptional({ maxLength: 80, writeOnly: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  iban?: string;
  @ApiPropertyOptional({ maxLength: 80, writeOnly: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  routingNumber?: string;
  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftBic?: string;
}

export class UpsertEmployeeStatutoryDetailDto {
  @ApiProperty({ example: 'OM', pattern: '^[A-Z]{2}$' })
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;
  @ApiProperty({ example: 'NATIONAL_ID', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  identifierType!: string;
  @ApiProperty({ minLength: 2, maxLength: 120, writeOnly: true })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  identifier!: string;
  @ApiPropertyOptional({ type: MetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;
}

export class UpdateProtectedDetailStatusDto {
  @ApiProperty({ enum: PayrollProtectedDetailStatus })
  @IsEnum(PayrollProtectedDetailStatus)
  status!: PayrollProtectedDetailStatus;
}

export class CreatePayrollApprovalPolicyDto {
  @ApiProperty({ example: 'Payroll approval', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

export class UpdatePayrollApprovalPolicyDto extends PartialType(
  CreatePayrollApprovalPolicyDto,
) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}

export class CreatePayrollApprovalPolicyVersionDto {
  @ApiProperty()
  @IsBoolean()
  fourEyesEnabled!: boolean;
  @ApiProperty()
  @IsBoolean()
  makerCanApprove!: boolean;
  @ApiProperty({ minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  requiredLevels!: number;
  @ApiProperty({ type: [String], example: ['payroll.runs.approve'] })
  @IsArray()
  @IsString({ each: true })
  allowedPermissions!: string[];
  @ApiProperty({ type: [String], example: ['FINANCE_ADMIN'] })
  @IsArray()
  @IsString({ each: true })
  allowedRoleKeys!: string[];
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class CreatePayrollAccountingMappingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  payComponentId!: string;
  @ApiProperty({ example: '6000', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  debitAccountCode!: string;
  @ApiProperty({ example: '2100', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  creditAccountCode!: string;
  @ApiProperty({ type: CostCenterRuleDto })
  @ValidateNested()
  @Type(() => CostCenterRuleDto)
  costCenterRule!: CostCenterRuleDto;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class UpdatePayrollAccountingMappingDto extends PartialType(
  CreatePayrollAccountingMappingDto,
) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
  @ApiPropertyOptional({ enum: PayrollRecordStatus })
  @IsOptional()
  @IsEnum(PayrollRecordStatus)
  status?: PayrollRecordStatus;
}

export class PayrollAuditQueryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityType?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  entityId?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
