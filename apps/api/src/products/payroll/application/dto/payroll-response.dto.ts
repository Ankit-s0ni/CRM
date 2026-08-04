import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayrollIdResponseDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export class PayrollIdVersionResponseDataDto extends PayrollIdResponseDataDto {
  @ApiProperty({ example: 1 })
  version!: number;
}

export class PayrollStatusResponseDataDto extends PayrollIdResponseDataDto {
  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class PayrollCommandResponseDto {
  @ApiProperty({ type: PayrollIdResponseDataDto })
  data!: PayrollIdResponseDataDto;
}

export class PayrollVersionedCommandResponseDto {
  @ApiProperty({ type: PayrollIdVersionResponseDataDto })
  data!: PayrollIdVersionResponseDataDto;
}

export class PayrollStatusCommandResponseDto {
  @ApiProperty({ type: PayrollStatusResponseDataDto })
  data!: PayrollStatusResponseDataDto;
}

export class PayrollSettingsResponseDataDto extends PayrollIdVersionResponseDataDto {
  @ApiProperty({ example: 'OM' })
  countryCode!: string;

  @ApiProperty({ example: 'OMR' })
  defaultCurrency!: string;

  @ApiProperty({ example: 'MONTHLY' })
  payFrequency!: string;

  @ApiProperty({ example: 'CALENDAR_DAYS' })
  workingDayBasis!: string;
}

export class PayrollSettingsResponseDto {
  @ApiProperty({ type: PayrollSettingsResponseDataDto })
  data!: PayrollSettingsResponseDataDto;
}

export class PayrollMaskedPaymentDetailDto extends PayrollIdVersionResponseDataDto {
  @ApiProperty({ example: 'BANK_TRANSFER' })
  paymentMethod!: string;

  @ApiPropertyOptional({ example: 'Bank Muscat', nullable: true })
  bankName?: string | null;

  @ApiPropertyOptional({ example: '****8877', nullable: true })
  accountNumberMasked?: string | null;

  @ApiPropertyOptional({ example: '****3333', nullable: true })
  ibanMasked?: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class PayrollMaskedPaymentDetailResponseDto {
  @ApiProperty({ type: PayrollMaskedPaymentDetailDto })
  data!: PayrollMaskedPaymentDetailDto;
}

export class PayrollMaskedStatutoryDetailDto extends PayrollIdVersionResponseDataDto {
  @ApiProperty({ example: 'OM' })
  countryCode!: string;

  @ApiProperty({ example: 'NATIONAL_ID' })
  identifierType!: string;

  @ApiPropertyOptional({ example: '****6789', nullable: true })
  identifierMasked?: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class PayrollMaskedStatutoryDetailResponseDto {
  @ApiProperty({ type: PayrollMaskedStatutoryDetailDto })
  data!: PayrollMaskedStatutoryDetailDto;
}

export class PayrollListResponseDto {
  @ApiProperty({ type: [Object] })
  data!: Record<string, unknown>[];
}

export class PayrollAuditMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;
}

export class PayrollAuditEntryDto extends PayrollIdResponseDataDto {
  @ApiProperty({ example: 'payroll.calendar.created' })
  action!: string;

  @ApiProperty({ example: 'PayrollCalendar' })
  entityType!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  entityId?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class PayrollAuditResponseDto {
  @ApiProperty({ type: [PayrollAuditEntryDto] })
  data!: PayrollAuditEntryDto[];

  @ApiProperty({ type: PayrollAuditMetaDto })
  meta!: PayrollAuditMetaDto;
}
