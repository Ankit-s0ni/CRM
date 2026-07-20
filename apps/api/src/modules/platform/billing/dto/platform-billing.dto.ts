import { BillingPeriod, PaymentGateway } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreatePlatformPlanDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  description?: string;

  @Matches(/^\d+(?:\.\d{1,3})?$/)
  pricePerUser!: string;

  @Matches(/^(INR|AED|OMR|QAR|SAR|USD)$/)
  currency!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxEmployees!: number;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, { each: true })
  moduleKeys!: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, { each: true })
  capabilityKeys?: string[];
}

export class UpdatePlatformPlanDto {
  @IsOptional()
  @IsBoolean()
  impactAcknowledged?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  description?: string;

  @IsOptional()
  @Matches(/^\d+(?:\.\d{1,3})?$/)
  pricePerUser?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxEmployees?: number;

  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, { each: true })
  moduleKeys?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, { each: true })
  capabilityKeys?: string[];
}

export class PlatformBillingQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(PaymentGateway)
  provider?: PaymentGateway;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class DunningRetryDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsString()
  @Length(10, 500)
  reason!: string;
}
