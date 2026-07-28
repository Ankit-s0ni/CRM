import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PosImportMode } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class PresignProductImportDto {
  @ApiProperty({ example: 'products.csv' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  filename!: string;

  @ApiProperty({ example: 'text/csv' })
  @IsString()
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ example: 51200 })
  @IsInt()
  @Min(1)
  fileSize!: number;
}

export class RegisterProductImportDto {
  @ApiProperty({ description: 'Object key returned by the presign call' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  objectKey!: string;

  @ApiPropertyOptional({
    enum: PosImportMode,
    default: PosImportMode.CREATE,
    description: 'UPSERT matches existing products on SKU',
  })
  @IsOptional()
  @IsEnum(PosImportMode)
  mode?: PosImportMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  originalFilename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Retrying with the same key returns the original job',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey?: string;
}
