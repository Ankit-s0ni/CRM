import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Customer Success' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: '0191d2e7-9ec3-7b94-bb3c-624f9d8d7a10',
  })
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsUUID()
  parentDeptId?: string | null;
}
