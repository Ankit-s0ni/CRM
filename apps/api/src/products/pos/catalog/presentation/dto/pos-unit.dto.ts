import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePosUnitDto {
  @ApiProperty({ example: 'PCS' })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  code!: string;

  @ApiProperty({ example: 'Piece' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ description: 'Unit this one converts into' })
  @IsOptional()
  @IsUUID()
  baseUnitId?: string;

  @ApiPropertyOptional({
    description:
      'How many base units one of these equals. String to preserve Decimal(12,4) precision.',
    example: '12.0000',
  })
  @IsOptional()
  @IsNumberString()
  conversionFactor?: string;
}

export class UpdatePosUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  baseUnitId?: string;

  @ApiPropertyOptional({ example: '12.0000' })
  @IsOptional()
  @IsNumberString()
  conversionFactor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
