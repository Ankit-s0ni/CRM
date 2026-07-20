import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'hr.admin@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Employee to link atomically when the invited user accepts the invitation',
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class ResendInvitationDto {
  @ApiProperty({ example: 'hr.admin@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ example: '4ad83d...' })
  @IsString()
  @MinLength(32)
  token!: string;

  @ApiProperty({ minLength: 8, example: 'Secure123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
