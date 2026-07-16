import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokenPurpose } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Acme Technologies' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName!: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  workEmail!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'acme' })
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
  subdomain!: string;

  @ApiPropertyOptional({ example: '26-100 employees' })
  @IsOptional()
  @IsString()
  employeeCount?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}

export class EmailDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class VerifyTokenDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ enum: TokenPurpose })
  @IsEnum(TokenPurpose)
  type!: TokenPurpose;
}
