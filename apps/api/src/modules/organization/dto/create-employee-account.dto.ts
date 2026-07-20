import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CreateEmployeeAccountDto {
  @ApiProperty({ example: 'aarav.sharma@acme.com' })
  @IsEmail()
  email!: string;
}
