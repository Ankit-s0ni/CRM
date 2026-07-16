import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleAvailability } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}

export class ReplaceTenantModulesDto {
  @ApiProperty({ type: [String], example: ['ATTENDANCE'] })
  @IsArray()
  @ArrayUnique()
  @Matches(MODULE_KEY, { each: true })
  moduleKeys!: string[];
}
