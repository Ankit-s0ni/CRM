import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @ApiProperty({ example: 'owner@deltcrm.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class VerifyPlatformMfaDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  challengeToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class PlatformRefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
