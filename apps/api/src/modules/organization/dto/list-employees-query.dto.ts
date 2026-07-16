import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus, WorkType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum EmployeeSort {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  CODE_ASC = 'code_asc',
  CODE_DESC = 'code_desc',
  JOINED_ASC = 'joined_asc',
  JOINED_DESC = 'joined_desc',
}

export class ListEmployeesQueryDto {
  @ApiPropertyOptional({ example: 'aarav' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: WorkType })
  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

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

  @ApiPropertyOptional({ enum: EmployeeSort, default: EmployeeSort.NAME_ASC })
  @IsOptional()
  @IsEnum(EmployeeSort)
  sort?: EmployeeSort;
}
