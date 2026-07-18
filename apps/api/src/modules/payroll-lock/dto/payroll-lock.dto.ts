import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreatePayrollLockDto {
  @Matches(/^\d{4}-\d{2}$/)
  period!: string;

  @IsUUID()
  exportId!: string;
}

export class ReopenPayrollLockDto {
  @IsString()
  @Length(10, 1000)
  reason!: string;
}
