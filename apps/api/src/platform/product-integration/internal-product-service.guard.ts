import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { ProductKey } from '@mariya-abdul/deltcrm-product-contracts';

export const AUTHENTICATED_PRODUCT_SERVICE = 'authenticatedProductService';

const PRODUCT_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

@Injectable()
export class InternalProductServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const credentials = this.credentials();
    if (credentials.size === 0) {
      throw new UnauthorizedException({
        code: 'SERVICE_CREDENTIAL_NOT_CONFIGURED',
        message: 'Product service authentication is unavailable',
      });
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
      [AUTHENTICATED_PRODUCT_SERVICE]?: ProductKey;
    }>();
    const suppliedProduct = this.header(request.headers['x-product-key'])
      ?.trim()
      .toUpperCase();
    if (!suppliedProduct || !PRODUCT_KEY_PATTERN.test(suppliedProduct)) {
      throw this.invalidCredential();
    }
    const supplied = request.headers['x-product-service-key'];
    const candidate = Array.isArray(supplied) ? supplied[0] : supplied;
    const acceptedKeys = credentials.get(suppliedProduct) ?? [];
    if (
      !candidate ||
      !acceptedKeys.some((key) => this.matches(candidate, key))
    ) {
      throw this.invalidCredential();
    }
    const requestedProduct = request.params?.productKey?.toUpperCase();
    if (requestedProduct && requestedProduct !== suppliedProduct) {
      throw new UnauthorizedException({
        code: 'SERVICE_PRODUCT_SCOPE_MISMATCH',
        message: 'The service credential cannot access another product scope',
      });
    }
    request[AUTHENTICATED_PRODUCT_SERVICE] = suppliedProduct;
    return true;
  }

  private credentials() {
    const configured = process.env.PRODUCT_SERVICE_CREDENTIALS_JSON;
    if (configured) {
      try {
        const parsed = JSON.parse(configured) as Record<string, unknown>;
        return new Map<ProductKey, string[]>(
          Object.entries(parsed)
            .map(
              ([product, values]) =>
                [
                  product.toUpperCase(),
                  Array.isArray(values)
                    ? values.filter(
                        (value): value is string =>
                          typeof value === 'string' && value.length > 0,
                      )
                    : [],
                ] as const,
            )
            .filter(
              ([product, values]) =>
                PRODUCT_KEY_PATTERN.test(product) && values.length > 0,
            ),
        );
      } catch {
        return new Map<ProductKey, string[]>();
      }
    }
    return new Map<ProductKey, string[]>();
  }

  private header(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }

  private invalidCredential() {
    return new UnauthorizedException({
      code: 'INVALID_SERVICE_CREDENTIAL',
      message: 'A valid product service credential is required',
    });
  }

  private matches(candidate: string, expected: string) {
    const left = Buffer.from(candidate);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
