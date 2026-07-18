import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAttendanceCapabilitiesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fieldTrackingEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  fieldTrackingIntervalMin?: number;
}
