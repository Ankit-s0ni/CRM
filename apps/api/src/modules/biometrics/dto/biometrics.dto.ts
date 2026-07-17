import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ResetFaceEnrollmentDto {
  @ApiProperty({ minLength: 5, maxLength: 500 })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

export class CreateBiometricConsentDto {
  @ApiProperty({ example: '1.2' })
  @IsString()
  @MaxLength(40)
  policyVersion!: string;

  @ApiProperty({ example: true })
  @Equals(true)
  accepted!: true;
}

export class EnrollmentPresignDto {
  @ApiProperty({ example: 'face.jpg' })
  @IsString()
  @MaxLength(120)
  filename!: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @ApiProperty({ minimum: 1024, maximum: 5000000 })
  @IsInt()
  @Min(1024)
  @Max(5_000_000)
  fileSize!: number;
}

export class CompleteEnrollmentDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  privateObjectKey!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(16)
  @MaxLength(4096)
  livenessProofToken!: string;
}
