import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

export const PRODUCT_REGISTRATION_IDENTITY = 'productRegistrationIdentity';

@Injectable()
export class ProductRegistrationCiGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [PRODUCT_REGISTRATION_IDENTITY]?: string;
    }>();
    const expected = process.env.PRODUCT_REGISTRATION_CI_KEY;
    const suppliedHeader = request.headers['x-product-registration-key'];
    const supplied = Array.isArray(suppliedHeader)
      ? suppliedHeader[0]
      : suppliedHeader;
    const identityHeader = request.headers['x-product-registration-identity'];
    const identity = Array.isArray(identityHeader)
      ? identityHeader[0]
      : identityHeader;
    if (
      !expected ||
      !supplied ||
      !identity ||
      !this.matches(supplied, expected)
    ) {
      throw new UnauthorizedException({
        code: 'PRODUCT_REGISTRATION_CREDENTIAL_INVALID',
        message: 'A valid product registration service identity is required',
      });
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,127}$/i.test(identity)) {
      throw new UnauthorizedException({
        code: 'PRODUCT_REGISTRATION_IDENTITY_INVALID',
      });
    }
    request[PRODUCT_REGISTRATION_IDENTITY] = identity;
    return true;
  }

  private matches(candidate: string, expected: string) {
    const left = Buffer.from(candidate);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
