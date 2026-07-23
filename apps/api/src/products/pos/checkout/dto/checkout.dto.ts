import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, IsUUID, Min, ValidateNested, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CheckoutDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ApiProperty()
  @IsString()
  @IsIn(['Bank Transfer', 'Amwal Pay', 'Thawani Pay'])
  paymentMethod!: string;
}
