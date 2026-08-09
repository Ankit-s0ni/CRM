import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { accessTokenFromRequest } from '../../shared/http/auth-cookies';

type JwtPayload = {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  deviceId?: string;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => accessTokenFromRequest(request, 'tenant'),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ||
        'super-secret-default-key-change-in-production',
    });
  }

  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      deviceId: payload.deviceId,
      exp: payload.exp,
    };
  }
}
