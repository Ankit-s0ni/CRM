import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedPlatformUser } from './platform-auth.types';

type PlatformJwtPayload = {
  sub: string;
  email: string;
  role: AuthenticatedPlatformUser['role'];
  sessionId: string;
  permissions: string[];
  mfaVerifiedAt: string;
};

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.PLATFORM_JWT_SECRET ?? 'dev-platform-secret-change-me',
      issuer: 'deltcrm-platform',
      audience: 'deltcrm-platform-api',
    });
  }

  validate(payload: PlatformJwtPayload): AuthenticatedPlatformUser {
    return {
      platformUserId: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      permissions: payload.permissions,
      mfaVerifiedAt: payload.mfaVerifiedAt,
    };
  }
}
