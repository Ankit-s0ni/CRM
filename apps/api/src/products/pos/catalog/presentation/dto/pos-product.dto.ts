import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Money is Decimal(12,3) end to end — strings only, never JSON numbers. */
export class CreatePosProductDto {
  @ApiProperty({ example: 'Organic Coffee Beans 250g' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'COF-ORG-250' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string;

  @ApiPropertyOptional({ example: '8901234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  vatCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taxGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unitOfMeasureId?: string;

  @ApiProperty({ example: '2.500', description: 'OMR, 3 decimal places' })
  @IsNumberString()
  costPrice!: string;

  @ApiProperty({ example: '4.500', description: 'OMR, 3 decimal places' })
  @IsNumberString()
  sellingPrice!: string;

  @ApiPropertyOptional({ example: '5.000' })
  @IsOptional()
  @IsNumberString()
  mrp?: string;

  @ApiPropertyOptional({ example: '3.800' })
  @IsOptional()
  @IsNumberString()
  wholesalePrice?: string;

  @ApiPropertyOptional({ example: '0.250' })
  @IsOptional()
  @IsNumberString()
  weight?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Uploaded image object keys',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sellByWeight?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderQuantity?: number;
}

export class UpdatePosProductDto extends CreatePosProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PosProductQueryDto {
  @ApiPropertyOptional({ description: 'Search name, SKU or barcode' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Defaults to active products only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;
}

export class PosProductLookupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;
}

export class PosVariantDto {
  @ApiProperty({ example: 'Red / Large' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  costPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  sellingPrice?: string;

  @ApiPropertyOptional({ example: { color: 'Red', size: 'Large' } })
  @IsOptional()
  attributes?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageKey?: string;
}

class VariantAttributeDto {
  @ApiProperty({ example: 'Size' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ type: [String], example: ['250g', '500g'] })
  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

export class GenerateVariantsDto {
  @ApiProperty({ type: [VariantAttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes!: VariantAttributeDto[];
}

class BundleComponentDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ example: '2.000' })
  @IsNumberString()
  quantity!: string;
}

export class PutBundleDto {
  @ApiProperty({ example: '9.000' })
  @IsNumberString()
  bundlePrice!: string;

  @ApiProperty({ type: [BundleComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleComponentDto)
  components!: BundleComponentDto[];
}

export class PresignProductImageDto {
  @ApiProperty({ example: 'coffee.png' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  fileSize!: number;
}
