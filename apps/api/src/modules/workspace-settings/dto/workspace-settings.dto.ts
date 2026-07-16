import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({
    example: [{ weekday: 'SAT', occurrences: [2, 4] }, { weekday: 'SUN' }],
  })
  @IsOptional()
  weeklyOffs?: unknown;

  @IsOptional()
  @IsString()
  workingDayStart?: string;

  @IsOptional()
  @IsString()
  workingDayEnd?: string;

  @IsOptional()
  @IsBoolean()
  requireFacialRecognition?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  faceMatchThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  fieldTrackingIntervalMin?: number;

  @IsOptional()
  @IsBoolean()
  checkinReminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  checkoutReminderMinutes?: number;

  @IsOptional()
  @IsString()
  absenteeAlertTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  onboardingStep?: number;
}

export class LogoPresignDto {
  @ApiProperty({ example: 'company-logo.png' })
  @IsString()
  @MaxLength(160)
  filename!: string;

  @ApiProperty({ enum: ['image/png', 'image/jpeg', 'image/webp'] })
  @IsString()
  contentType!: string;

  @ApiProperty({ example: 245760 })
  @IsInt()
  @Min(1)
  @Max(2_000_000)
  fileSize!: number;
}

export class CompleteOnboardingDto {
  @ApiPropertyOptional({ description: 'Final client-side progress snapshot' })
  @IsOptional()
  @IsObject()
  progress?: Record<string, unknown>;
}
