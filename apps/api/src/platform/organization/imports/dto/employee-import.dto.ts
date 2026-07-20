import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PresignEmployeeImportDto {
  @ApiProperty({ example: 'employees.csv' })
  @IsString()
  @MaxLength(180)
  filename!: string;

  @ApiProperty({ example: 'text/csv' })
  @IsIn(['text/csv', 'application/csv', 'application/vnd.ms-excel'])
  contentType!: string;

  @ApiProperty({ example: 20480, maximum: 5_242_880 })
  @IsInt()
  @Min(1)
  @Max(5_242_880)
  fileSize!: number;
}

export class RegisterEmployeeImportDto extends PresignEmployeeImportDto {
  @ApiProperty({ example: 'tenant-id/employee-imports/file.csv' })
  @IsString()
  objectKey!: string;
}

export class ListEmployeeImportsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
