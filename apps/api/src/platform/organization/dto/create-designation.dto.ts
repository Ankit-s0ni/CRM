import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDesignationDto {
  @ApiProperty({ example: 'HR Executive' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
