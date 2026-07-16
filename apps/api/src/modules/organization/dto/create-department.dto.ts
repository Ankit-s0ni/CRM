import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Operations' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: '0191d2e7-9ec3-7b94-bb3c-624f9d8d7a10',
  })
  @IsOptional()
  @IsUUID()
  parentDeptId?: string;
}
