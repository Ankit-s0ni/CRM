import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class StartFieldSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceUuid!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientStartUuid!: string;
}

export class StopFieldSessionDto {
  @ApiProperty({ enum: ['MANUAL', 'BATTERY'] })
  @IsString()
  endReason!: 'MANUAL' | 'BATTERY';
}

export class FieldPingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientPingUuid!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  accuracyM?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  speedMps?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMock?: boolean;

  @ApiProperty()
  @IsDateString({ strict: true })
  capturedAt!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOfflineSync?: boolean;
}

export class FieldPingBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceUuid!: string;

  @ApiProperty({ type: [FieldPingDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FieldPingDto)
  items!: FieldPingDto[];
}

export class RouteDateParamDto {
  @ApiProperty({ example: '2026-07-17' })
  @IsString()
  @MaxLength(10)
  date!: string;
}
