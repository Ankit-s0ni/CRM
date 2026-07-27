import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PUBLIC_LANGUAGES } from '../localization.constants';

export class UpdateTenantLocalePolicyDto {
  @IsIn(PUBLIC_LANGUAGES)
  defaultLanguage!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(PUBLIC_LANGUAGES, { each: true })
  enabledLanguages!: string[];

  @IsBoolean()
  allowUserPreference!: boolean;
}

export class CreateTenantTranslationOverrideDto {
  @IsIn(PUBLIC_LANGUAGES)
  locale!: string;

  @IsString()
  key!: string;

  @IsString()
  @MinLength(1)
  value!: string;

  @IsString()
  @MinLength(5)
  reason!: string;
}

export class UpdateTenantTranslationOverrideDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  value?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  reason?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}
