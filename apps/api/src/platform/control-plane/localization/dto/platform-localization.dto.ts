import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PUBLIC_LANGUAGES,
  SUPPORTED_LOCALES,
} from '../../../localization/localization.constants';

export class CreatePlatformLocalePackDto {
  @IsIn(SUPPORTED_LOCALES)
  locale!: string;
}

export class SavePlatformTranslationDto {
  @IsString()
  key!: string;

  @IsString()
  @MinLength(1)
  value!: string;
}

export class UpdatePlatformTenantLocalePolicyDto {
  @IsIn(PUBLIC_LANGUAGES)
  defaultLocale!: string;

  @IsIn(SUPPORTED_LOCALES)
  regionalLocale!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(PUBLIC_LANGUAGES, { each: true })
  enabledLocales!: string[];

  @IsBoolean()
  allowUserPreference!: boolean;

  @IsBoolean()
  allowTenantOverrides!: boolean;

  @IsOptional()
  @IsString()
  @MinLength(10)
  overrideReason?: string;
}

class TranslationImportRowDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

export class ImportPlatformTranslationsDto {
  @IsBoolean()
  dryRun!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationImportRowDto)
  translations!: TranslationImportRowDto[];
}
