import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollCountryPackStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePayrollCountryRulePackDto {
  @ApiProperty({ example: 'OM' })
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @ApiProperty({ example: '2026.1' })
  @MinLength(2)
  @MaxLength(40)
  version!: string;

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

export class UpdatePayrollCountryRulePackStatusDto {
  @ApiProperty({ enum: PayrollCountryPackStatus })
  @IsEnum(PayrollCountryPackStatus)
  status!: PayrollCountryPackStatus;
}

export class PayrollCountryRulePackResponseDto {
  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;
}

export class PayrollCountryRulePackListResponseDto {
  @ApiProperty({ type: [Object] })
  data!: Record<string, unknown>[];
}
