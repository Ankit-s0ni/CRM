import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  EmployeePayrollStatus,
  PayComponentType,
  PayComponentValueMode,
  PayrollFrequency,
  PayrollModuleStatus,
  PayrollPaymentMethod,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
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
  ValidateNested,
} from 'class-validator';
import {
  PayComponentConfigDto,
  PayrollPayoutDateRuleDto,
  PayrollPeriodRuleDto,
  PayrollPolicyConfigDto,
  RoundingRuleDto,
} from './payroll-configuration.dto';

export class CreatePayrollSettingsDto {
  @ApiProperty({ example: 'OM', pattern: '^[A-Z]{2}$' })
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;
  @ApiProperty({ example: 'OMR', pattern: '^[A-Z]{3}$' })
  @Matches(/^[A-Z]{3}$/)
  defaultCurrency!: string;
  @ApiProperty({ example: 'en-OM', minLength: 2, maxLength: 20 })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  locale!: string;
  @ApiProperty({ example: 'Asia/Muscat', minLength: 3, maxLength: 80 })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  timezone!: string;
  @ApiProperty({ enum: PayrollFrequency })
  @IsEnum(PayrollFrequency)
  payFrequency!: PayrollFrequency;
  @ApiProperty({ type: PayrollPeriodRuleDto })
  @ValidateNested()
  @Type(() => PayrollPeriodRuleDto)
  defaultPayPeriodRule!: PayrollPeriodRuleDto;
  @ApiProperty({ type: PayrollPayoutDateRuleDto })
  @ValidateNested()
  @Type(() => PayrollPayoutDateRuleDto)
  defaultPayoutDateRule!: PayrollPayoutDateRuleDto;
  @ApiProperty({ enum: ['CALENDAR_DAYS', 'WORKING_DAYS', 'FIXED_DAYS'] })
  @IsIn(['CALENDAR_DAYS', 'WORKING_DAYS', 'FIXED_DAYS'])
  workingDayBasis!: string;
  @ApiProperty({ type: PayrollPolicyConfigDto })
  @ValidateNested()
  @Type(() => PayrollPolicyConfigDto)
  defaultProrationPolicy!: PayrollPolicyConfigDto;
  @ApiProperty({ type: RoundingRuleDto })
  @ValidateNested()
  @Type(() => RoundingRuleDto)
  defaultRoundingPolicy!: RoundingRuleDto;
  @ApiPropertyOptional({ enum: PayrollModuleStatus })
  @IsOptional()
  @IsEnum(PayrollModuleStatus)
  moduleStatus?: PayrollModuleStatus;
  @ApiProperty({ format: 'date', example: '2026-01-01' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date', example: '2026-12-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class UpdatePayrollSettingsDto extends PartialType(
  CreatePayrollSettingsDto,
) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}

export class CreatePayGroupDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  calendarId?: string;
  @ApiProperty({ example: 'Monthly Oman', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiProperty({ example: 'MONTHLY_OM', pattern: '^[A-Z0-9_-]{2,40}$' })
  @Matches(/^[A-Z0-9_-]{2,40}$/)
  code!: string;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiProperty({ example: 'OMR', pattern: '^[A-Z]{3}$' })
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
  @ApiProperty({ example: 'OM', pattern: '^[A-Z]{2}$' })
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;
  @ApiPropertyOptional({ type: PayrollPolicyConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollPolicyConfigDto)
  prorationPolicyOverride?: PayrollPolicyConfigDto;
  @ApiPropertyOptional({ type: RoundingRuleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoundingRuleDto)
  roundingPolicyOverride?: RoundingRuleDto;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  overtimePolicyId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  lossOfPayPolicyId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  approvalPolicyId?: string;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class UpdatePayGroupDto extends PartialType(CreatePayGroupDto) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}

export class AssignEmployeeToPayGroupDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class CreatePayComponentDto {
  @ApiProperty({ example: 'BASIC', pattern: '^[A-Z0-9_-]{2,40}$' })
  @Matches(/^[A-Z0-9_-]{2,40}$/)
  code!: string;
  @ApiProperty({ example: 'Basic salary', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiProperty({ enum: PayComponentType })
  @IsEnum(PayComponentType)
  type!: PayComponentType;
}

export class CreatePayComponentVersionDto {
  @ApiProperty({ enum: PayComponentValueMode })
  @IsEnum(PayComponentValueMode)
  valueMode!: PayComponentValueMode;
  @ApiProperty()
  @IsBoolean()
  taxable!: boolean;
  @ApiProperty()
  @IsBoolean()
  statutory!: boolean;
  @ApiProperty()
  @IsBoolean()
  recurring!: boolean;
  @ApiProperty({ minimum: 0, maximum: 10000, example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  calculationOrder!: number;
  @ApiProperty({ example: 'EMPLOYEE_CURRENCY', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  currencyBehavior!: string;
  @ApiProperty({ type: RoundingRuleDto })
  @ValidateNested()
  @Type(() => RoundingRuleDto)
  roundingBehavior!: RoundingRuleDto;
  @ApiProperty({ type: PayComponentConfigDto })
  @ValidateNested()
  @Type(() => PayComponentConfigDto)
  config!: PayComponentConfigDto;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class CreateSalaryStructureDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payGroupId?: string;
  @ApiProperty({ example: 'OM_MONTHLY', pattern: '^[A-Z0-9_-]{2,40}$' })
  @Matches(/^[A-Z0-9_-]{2,40}$/)
  code!: string;
  @ApiProperty({ example: 'Oman monthly salary', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiProperty({ example: 'OMR', pattern: '^[A-Z]{3}$' })
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

export class CreateSalaryStructureVersionDto {
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class AddSalaryStructureComponentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  payComponentVersionId!: string;
  @ApiPropertyOptional({
    description: 'Integer minor units as a string',
    example: '1234567',
  })
  @IsOptional()
  @Matches(/^\d+$/)
  fixedAmountMinor?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  percentageBasisPoints?: number;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  formulaReference?: string;
  @ApiProperty({ minimum: 0, maximum: 10000, example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  calculationOrder!: number;
  @ApiProperty()
  @IsBoolean()
  required!: boolean;
}

export class CreateEmployeePayrollProfileDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payGroupId?: string;
  @ApiPropertyOptional({ enum: EmployeePayrollStatus })
  @IsOptional()
  @IsEnum(EmployeePayrollStatus)
  payrollStatus?: EmployeePayrollStatus;
  @ApiProperty({ example: 'OM', pattern: '^[A-Z]{2}$' })
  @Matches(/^[A-Z]{2}$/)
  payrollCountry!: string;
  @ApiPropertyOptional({ enum: PayrollPaymentMethod })
  @IsOptional()
  @IsEnum(PayrollPaymentMethod)
  paymentMethod?: PayrollPaymentMethod;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  salaryHold?: boolean;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateEmployeePayrollProfileDto extends PartialType(
  CreateEmployeePayrollProfileDto,
) {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  version!: number;
}

export class CreateEmployeeCompensationVersionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salaryStructureVersionId!: string;
  @ApiProperty({ example: '1234567', pattern: '^\\d+$' })
  @Matches(/^\d+$/)
  baseAmountMinor!: string;
  @ApiProperty({ example: 'OMR', pattern: '^[A-Z]{3}$' })
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveFrom!: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}

export class EndEmployeeCompensationVersionDto {
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveTo!: string;
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}

export class EffectivePayrollPolicyQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId!: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payGroupId?: string;
  @ApiProperty({ example: 'PRORATION' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  policyType!: string;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  effectiveDate!: string;
}

export class ListQueryDto {
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

export class BulkIdsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('all', { each: true })
  ids!: string[];
}
