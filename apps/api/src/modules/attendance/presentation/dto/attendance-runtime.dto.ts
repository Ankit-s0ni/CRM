import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export class WebPunchDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Client-generated idempotency key for safe retries',
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;
}

export class AttendanceHistoryQueryDto {
  @ApiPropertyOptional({ example: '2026-07' })
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}

export class AttendanceDayQueryDto {
  @ApiPropertyOptional({ example: '2026-07-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
