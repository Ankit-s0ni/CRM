import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
} from 'class-validator';

export class PunchEvidencePresignDto {
  @ApiProperty({ example: 'punch.jpg' })
  @IsString()
  @MaxLength(120)
  filename!: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @ApiProperty({ minimum: 1024, maximum: 5000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(5_000_000)
  fileSize!: number;
}

export class DeviceIntegrityChallengeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceUuid!: string;

  @ApiProperty({ enum: ['PUNCH', 'OFFLINE_PUNCH'] })
  @IsIn(['PUNCH', 'OFFLINE_PUNCH'])
  action!: 'PUNCH' | 'OFFLINE_PUNCH';
}

export class VerifiedPunchDto {
  @ApiProperty({ enum: ['CHECKIN', 'CHECKOUT', 'BREAK_START', 'BREAK_END'] })
  @IsIn(['CHECKIN', 'CHECKOUT', 'BREAK_START', 'BREAK_END'])
  type!: 'CHECKIN' | 'CHECKOUT' | 'BREAK_START' | 'BREAK_END';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceUuid!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(16384)
  attestationToken!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  clientTime!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  requestId!: string;

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
