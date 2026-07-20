import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const departmentViews = ['flat', 'tree'] as const;

export class ListDepartmentsQueryDto {
  @ApiPropertyOptional({ enum: departmentViews, default: 'flat' })
  @IsOptional()
  @IsIn(departmentViews)
  view?: (typeof departmentViews)[number];
}
