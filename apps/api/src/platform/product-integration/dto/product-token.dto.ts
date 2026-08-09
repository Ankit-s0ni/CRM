import { IsIn } from 'class-validator';
import type { ProductAudience } from '@deltcrm/product-contracts';

export class ProductTokenDto {
  @IsIn(['hrms-api', 'mail-api', 'pos-api'])
  audience!: ProductAudience;
}
