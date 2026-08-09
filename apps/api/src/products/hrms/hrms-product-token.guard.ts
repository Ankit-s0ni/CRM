import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  PRODUCT_TOKEN_VERIFICATION_KEY,
  PRODUCT_PLATFORM_PORT,
  type ProductPlatformPort,
  type ProductTokenClaims,
  type ProductTokenVerificationKey,
} from '@deltcrm/product-contracts';
import { HRMS_AUDIENCE } from '@deltcrm/product-contracts/hrms';

export const HRMS_PRODUCT_IDENTITY = 'productIdentity';

@Injectable()
export class HrmsProductTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(PRODUCT_TOKEN_VERIFICATION_KEY)
    private readonly verification: ProductTokenVerificationKey,
    @Inject(PRODUCT_PLATFORM_PORT)
    private readonly platform: ProductPlatformPort,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [HRMS_PRODUCT_IDENTITY]?: ProductTokenClaims;
    }>();
    const authorization = request.headers.authorization;
    const value = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    const token = value?.startsWith('Bearer ') ? value.slice(7) : undefined;
    if (!token) throw this.unauthorized('PRODUCT_TOKEN_REQUIRED');

    try {
      const claims = this.jwt.verify<ProductTokenClaims>(token, {
        publicKey: this.verification.publicKey,
        algorithms: ['RS256'],
        issuer: this.verification.issuer,
        audience: HRMS_AUDIENCE,
      });
      if (
        claims.sub !== claims.userId ||
        !claims.tenantId ||
        !claims.membershipId ||
        !claims.products.includes('HRMS')
      ) {
        throw this.unauthorized('INVALID_PRODUCT_TOKEN_CLAIMS');
      }
      const requestedTenant = this.header(request.headers['x-tenant-id']);
      if (requestedTenant && requestedTenant !== claims.tenantId) {
        throw this.unauthorized('PRODUCT_TOKEN_TENANT_MISMATCH');
      }

      const [identity, entitlements] = await Promise.all([
        this.platform.getIdentityStatus({
          tenantId: claims.tenantId,
          userId: claims.userId,
          membershipId: claims.membershipId,
        }),
        this.platform.getEntitlements(claims.tenantId),
      ]);
      if (identity.tenantStatus !== 'ACTIVE') {
        throw new ForbiddenException({
          code: 'TENANT_ACCESS_SUSPENDED',
          message: 'This workspace is not active',
        });
      }
      if (
        identity.userStatus !== 'ACTIVE' ||
        identity.membershipStatus !== 'ACTIVE'
      ) {
        throw this.unauthorized('PRODUCT_IDENTITY_INACTIVE');
      }
      const hrms = entitlements.products.find(({ key }) => key === 'HRMS');
      if (entitlements.subscriptionStatus === 'SUSPENDED' || !hrms?.active) {
        throw new ForbiddenException({
          code: 'PRODUCT_NOT_ENTITLED',
          message: 'HRMS is not enabled for this workspace',
        });
      }
      request[HRMS_PRODUCT_IDENTITY] = claims;
      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw this.unauthorized('INVALID_PRODUCT_TOKEN');
    }
  }

  private header(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }

  private unauthorized(code: string) {
    return new UnauthorizedException({
      code,
      message: 'A valid HRMS product token is required',
    });
  }
}
