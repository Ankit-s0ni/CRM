import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ModuleAvailability,
  ModuleKind,
  TenantOverrideMode,
} from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsDateString,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const MODULE_KEY = /^[A-Z][A-Z0-9_]{1,49}$/;

export class CreatePlatformModuleDto {
  @ApiProperty({ example: 'LEAVE' })
  @IsString()
  @Matches(MODULE_KEY)
  key!: string;

  @ApiProperty({ example: 'Leave Management' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'calendar-days' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiPropertyOptional({ enum: ModuleAvailability })
  @IsOptional()
  @IsEnum(ModuleAvailability)
  availability?: ModuleAvailability;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(MODULE_KEY, { each: true })
  dependencyKeys?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(MODULE_KEY, { each: true })
  conflictKeys?: string[];

  @ApiPropertyOptional({ enum: ModuleKind })
  @IsOptional()
  @IsEnum(ModuleKind)
  kind?: ModuleKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentModuleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  catalogOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customerVisible?: boolean;
}

export class UpdatePlatformModuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiPropertyOptional({ enum: ModuleAvailability })
  @IsOptional()
  @IsEnum(ModuleAvailability)
  availability?: ModuleAvailability;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(MODULE_KEY, { each: true })
  dependencyKeys?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(MODULE_KEY, { each: true })
  conflictKeys?: string[];

  @ApiPropertyOptional({ enum: ModuleKind })
  @IsOptional()
  @IsEnum(ModuleKind)
  kind?: ModuleKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentModuleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  catalogOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customerVisible?: boolean;
}

export class ReplaceTenantModulesDto {
  @ApiProperty({ type: [String], example: ['ATTENDANCE'] })
  @IsArray()
  @ArrayUnique()
  @Matches(MODULE_KEY, { each: true })
  moduleKeys!: string[];
}

export class TenantCapabilityOverrideDto {
  @Matches(MODULE_KEY)
  capabilityKey!: string;

  @IsEnum(TenantOverrideMode)
  mode!: TenantOverrideMode;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class ReplaceTenantCapabilityOverridesDto {
  @IsArray()
  @ArrayUnique((item: TenantCapabilityOverrideDto) => item.capabilityKey)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TenantCapabilityOverrideDto)
  overrides!: TenantCapabilityOverrideDto[];
}
