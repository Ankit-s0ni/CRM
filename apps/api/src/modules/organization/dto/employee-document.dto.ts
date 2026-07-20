import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export const EMPLOYEE_DOCUMENT_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class PresignEmployeeDocumentDto {
  @IsString() @Length(1, 200) filename!: string;
  @IsIn(EMPLOYEE_DOCUMENT_CONTENT_TYPES) contentType!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10_000_000) fileSize!: number;
}

export class RegisterEmployeeDocumentDto extends PresignEmployeeDocumentDto {
  @IsString() @Length(1, 500) objectKey!: string;
  @IsString() @Length(2, 100) title!: string;
  @IsString() @Length(2, 50) documentType!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
