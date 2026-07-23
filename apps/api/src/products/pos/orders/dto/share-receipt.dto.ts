import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareReceiptDto {
  @ApiProperty({ enum: ['email', 'whatsapp'] })
  @IsString()
  @IsIn(['email', 'whatsapp'])
  type!: string;

  @ApiProperty()
  @IsString()
  target!: string;
}
