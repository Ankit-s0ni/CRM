import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';

type Payload = {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  platformUserId: string;
  platformSessionId: string;
  impersonationSessionId: string;
  scopes: string[];
  jti: string;
};

@Injectable()
export class ImpersonationJwtStrategy extends PassportStrategy(
  Strategy,
  'impersonation-jwt',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.IMPERSONATION_JWT_SECRET ??
        'dev-impersonation-secret-change-me',
      issuer: 'deltcrm-impersonation',
      audience: 'deltcrm-tenant-api',
    });
  }
  validate(payload: Payload): AuthenticatedUser & {
    impersonationTokenJti: string;
    platformSessionId: string;
  } {
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      impersonationSessionId: payload.impersonationSessionId,
      impersonationPlatformUserId: payload.platformUserId,
      impersonationScopes: payload.scopes,
      impersonationTokenJti: payload.jti,
      platformSessionId: payload.platformSessionId,
    };
  }
}
