import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class TerminateEmployeeDto {
  @ApiProperty({ example: '2026-07-31', format: 'date' })
  @Matches(DATE_ONLY_PATTERN, { message: 'exitDate must use YYYY-MM-DD' })
  exitDate!: string;

  @ApiPropertyOptional({ example: 'Voluntary resignation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReactivateEmployeeDto {
  @ApiPropertyOptional({ example: '2026-08-01', format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'effectiveDate must use YYYY-MM-DD',
  })
  effectiveDate?: string;
}
