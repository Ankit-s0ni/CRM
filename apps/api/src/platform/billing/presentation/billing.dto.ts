import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway, PaymentMethodType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BillingAddressDto {
  @IsString()
  @Length(2, 120)
  line1!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  line2?: string;

  @IsString()
  @Length(2, 80)
  city!: string;

  @IsString()
  @Length(2, 80)
  state!: string;

  @Matches(/^[A-Z0-9 -]{3,12}$/i)
  postalCode!: string;

  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;
}

export class UpdateBillingProfileDto {
  @ApiProperty()
  @IsString()
  @Length(2, 160)
  legalName!: string;

  @ApiProperty()
  @IsEmail()
  billingEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/)
  gstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
  pan?: string;

  @ApiProperty({ enum: ['INR', 'AED', 'OMR', 'QAR', 'SAR', 'USD'] })
  @Matches(/^(INR|AED|OMR|QAR|SAR|USD)$/)
  currency!: string;

  @ValidateNested()
  @Type(() => BillingAddressDto)
  address!: BillingAddressDto;
}

export enum PlanChangeTiming {
  NOW = 'NOW',
  PERIOD_END = 'PERIOD_END',
}

export class ChangePlanDto {
  @IsUUID()
  planId!: string;

  @IsEnum(PlanChangeTiming)
  effective!: PlanChangeTiming;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  confirm = false;
}

export class AddPaymentMethodDto {
  @IsEnum(PaymentGateway)
  gateway!: PaymentGateway;

  @ApiProperty({ description: 'Token/reference returned by the provider SDK' })
  @IsString()
  @Length(6, 255)
  @Matches(/^[A-Za-z0-9_.:-]+$/)
  providerMethodRef!: string;

  @IsEnum(PaymentMethodType)
  methodType!: PaymentMethodType;

  @IsString()
  @Length(2, 80)
  displayName!: string;

  @IsOptional()
  @Matches(/^[0-9]{4}$/)
  lastFour?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2026)
  @Max(2200)
  expiryYear?: number;

  @IsOptional()
  @IsBoolean()
  isDefault = false;
}

export class BillingInvoiceQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}
