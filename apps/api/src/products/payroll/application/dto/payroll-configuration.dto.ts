import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PayrollPeriodRuleDto {
  @ApiProperty({
    enum: [
      'calendar-month',
      'month-start',
      'month-end',
      'fixed-day',
      'day-of-month',
    ],
    example: 'day-of-month',
  })
  @IsIn([
    'calendar-month',
    'month-start',
    'month-end',
    'fixed-day',
    'day-of-month',
  ])
  type!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 31, example: 26 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;

  @ApiPropertyOptional({ minimum: -1, maximum: 1, example: -1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  @Max(1)
  offsetMonth?: number;
}

export class PayrollPayoutDateRuleDto {
  @ApiProperty({
    enum: [
      'fixed-day',
      'offset-after-period-end',
      'configured-day-after-close',
    ],
    example: 'offset-after-period-end',
  })
  @IsIn(['fixed-day', 'offset-after-period-end', 'configured-day-after-close'])
  type!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 31, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(31)
  days?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 31, example: 28 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;
}

export class PayrollPolicyConfigDto {
  @ApiPropertyOptional({
    enum: [
      'proration-v1',
      'working-day-v1',
      'rounding-v1',
      'overtime-v1',
      'loss-of-pay-v1',
      'joiner-v1',
      'leaver-v1',
      'approval-workflow-v1',
      'payment-configuration-v1',
      'accounting-configuration-v1',
    ],
    example: 'proration-v1',
  })
  @IsOptional()
  @IsIn([
    'proration-v1',
    'working-day-v1',
    'rounding-v1',
    'overtime-v1',
    'loss-of-pay-v1',
    'joiner-v1',
    'leaver-v1',
    'approval-workflow-v1',
    'payment-configuration-v1',
    'accounting-configuration-v1',
  ])
  schemaVersion?: string;

  @ApiPropertyOptional({
    enum: [
      'organization',
      'organization-days',
      'pay-group',
      'calendar-days',
      'working-days',
      'fixed-days',
      'nearest',
      'up',
      'down',
      'ignore',
      'pay',
      'deduct',
      'include',
      'exclude',
      'prorate',
    ],
    example: 'working-days',
  })
  @IsOptional()
  @IsIn([
    'organization',
    'organization-days',
    'pay-group',
    'calendar-days',
    'working-days',
    'fixed-days',
    'nearest',
    'up',
    'down',
    'ignore',
    'pay',
    'deduct',
    'include',
    'exclude',
    'prorate',
  ])
  method?: string;

  @ApiPropertyOptional({ enum: ['nearest', 'up', 'down'], example: 'nearest' })
  @IsOptional()
  @IsIn(['nearest', 'up', 'down'])
  mode?: string;

  @ApiPropertyOptional({
    enum: ['CALENDAR_DAYS', 'WORKING_DAYS', 'FIXED_DAYS'],
  })
  @IsOptional()
  @IsIn(['CALENDAR_DAYS', 'WORKING_DAYS', 'FIXED_DAYS'])
  basis?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 31, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  fixedDays?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000, example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  precisionBasisPoints?: number;
}

export class PayComponentConfigDto {
  @ApiPropertyOptional({ enum: ['component-v1'], example: 'component-v1' })
  @IsOptional()
  @IsIn(['component-v1'])
  schemaVersion?: string;

  @ApiPropertyOptional({ enum: ['basic', 'gross', 'ctc'], example: 'basic' })
  @IsOptional()
  @IsIn(['basic', 'gross', 'ctc'])
  amountType?: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'BASIC' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  formulaReference?: string;
}

export class RoundingRuleDto {
  @ApiPropertyOptional({ enum: ['rounding-v1'], example: 'rounding-v1' })
  @IsOptional()
  @IsIn(['rounding-v1'])
  schemaVersion?: string;

  @ApiPropertyOptional({ enum: ['nearest', 'up', 'down'], example: 'nearest' })
  @IsOptional()
  @IsIn(['nearest', 'up', 'down'])
  mode?: string;

  @ApiPropertyOptional({ enum: ['nearest', 'up', 'down'], example: 'nearest' })
  @IsOptional()
  @IsIn(['nearest', 'up', 'down'])
  method?: string;
}

export class CostCenterRuleDto {
  @ApiProperty({
    enum: ['department', 'office', 'fixed'],
    example: 'department',
  })
  @IsIn(['department', 'office', 'fixed'])
  mode!: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'FINANCE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  value?: string;
}

export class MetadataDto {
  @ApiPropertyOptional({ example: 'tax-office' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  issuingAuthority?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
