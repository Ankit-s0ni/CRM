import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SyncAttendanceItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientEventUuid!: string;

  @ApiProperty({ enum: ['CHECKIN', 'CHECKOUT', 'BREAK_START', 'BREAK_END'] })
  @IsIn(['CHECKIN', 'CHECKOUT', 'BREAK_START', 'BREAK_END'])
  type!: 'CHECKIN' | 'CHECKOUT' | 'BREAK_START' | 'BREAK_END';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceUuid!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  attestationToken!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  integrityIssuedAt!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  integrityExpiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  clientTime!: string;

  @ApiProperty({ description: 'Client clock minus trusted server clock' })
  @Type(() => Number)
  @IsInt()
  @Min(-86_400)
  @Max(86_400)
  clientClockOffsetSeconds!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  accuracyMeters?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  mockLocation?: boolean;

  @ApiPropertyOptional({ writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  selfieKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  osVersion?: string;
}

export class AttendanceSyncDto {
  @ApiProperty({ type: [SyncAttendanceItemDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyncAttendanceItemDto)
  items!: SyncAttendanceItemDto[];
}
