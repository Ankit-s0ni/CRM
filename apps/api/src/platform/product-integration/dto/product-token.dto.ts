import { IsOptional, Matches, ValidateIf } from 'class-validator';
import type {
  ProductAudience,
  ProductKey,
  ProductTokenRequest,
} from '@mariya-abdul/deltcrm-product-contracts';

export class ProductTokenDto implements ProductTokenRequest {
  @ValidateIf((value: ProductTokenDto) => !value.audience)
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/)
  productKey?: ProductKey;

  @IsOptional()
  @Matches(/^[a-z][a-z0-9-]{1,63}-api$/)
  audience?: ProductAudience;
}
