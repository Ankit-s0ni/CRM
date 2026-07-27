import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePosSettingsDto {
  @ApiPropertyOptional({ description: 'Oman VAT registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatRegistrationType?: string;

  @ApiPropertyOptional({
    description: 'Whether catalog prices already include VAT',
  })
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoPrintReceipt?: boolean;

  @ApiPropertyOptional({
    description:
      'Maximum discount percentage a cashier may apply without an override. String to preserve Decimal(5,3) precision.',
    example: '10.000',
  })
  @IsOptional()
  @IsNumberString()
  maxDiscountPercent?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  returnWindowDays?: number;

  @ApiPropertyOptional({ example: 'INV' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  invoicePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptHeader?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptFooter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
