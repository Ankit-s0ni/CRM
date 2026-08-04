import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollOutputKind, PayrollPaymentStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PayrollActionReasonDto {
  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}

export class PayrollOverrideResultDto extends PayrollActionReasonDto {
  @ApiProperty({ example: '1234567' })
  @Matches(/^-?\d+$/)
  netPayMinor!: string;
}

export class GeneratePayrollOutputDto {
  @ApiProperty({ enum: PayrollOutputKind })
  @IsEnum(PayrollOutputKind)
  kind!: PayrollOutputKind;

  @ApiProperty({ example: 'standard-json-v1' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  adapterKey!: string;
}

export class MarkPayrollPaidDto {
  @ApiProperty({
    enum: PayrollPaymentStatus,
    example: PayrollPaymentStatus.PAID,
  })
  @IsEnum(PayrollPaymentStatus)
  status!: PayrollPaymentStatus;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class PayrollProcessingResponseDto {
  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;
}
