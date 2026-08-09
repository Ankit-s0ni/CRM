import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import {
  PlatformLoginDto,
  PlatformRefreshDto,
  VerifyPlatformMfaDto,
} from './dto/platform-auth.dto';
import { PlatformAuthService } from './platform-auth.service';
import type { AuthenticatedPlatformUser } from './platform-auth.types';
import { PlatformJwtGuard } from './platform-jwt.guard';
import {
  clearBrowserSessionCookies,
  isWebAuthRequest,
  refreshTokenFromRequest,
  setBrowserSessionCookies,
  withoutSessionTokens,
} from '../../../shared/http/auth-cookies';

@ApiTags('Platform Authentication')
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate platform password and issue MFA challenge',
  })
  @ApiOkResponse({
    schema: {
      example: {
        mfaRequired: true,
        challengeToken: 'opaque-one-time-token',
        expiresIn: 300,
      },
    },
  })
  async login(
    @Body() body: PlatformLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(
      body.email,
      body.password,
      this.metadata(request),
    );
    return this.toClientSession(request, response, result);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete platform login using a TOTP code' })
  async verifyMfa(
    @Body() body: VerifyPlatformMfaDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.verifyMfa(
      body.challengeToken,
      body.code,
      this.metadata(request),
    );
    return this.toClientSession(request, response, session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a platform refresh token' })
  async refresh(
    @Body() body: PlatformRefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      body.refreshToken ?? refreshTokenFromRequest(request, 'platform');
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    const session = await this.auth.refresh(
      refreshToken,
      this.metadata(request),
    );
    return this.toClientSession(request, response, session);
  }

  @Post('logout')
  @UseGuards(PlatformJwtGuard)
  @ApiBearerAuth()
  @ApiBody({
    required: false,
    schema: { type: 'object', additionalProperties: false },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current platform session' })
  async logout(
    @CurrentUser() user: AuthenticatedPlatformUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.logout(user, this.metadata(request));
    clearBrowserSessionCookies(response, 'platform');
    return result;
  }

  @Get('me')
  @UseGuards(PlatformJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current platform identity and permissions',
  })
  me(@CurrentUser() user: AuthenticatedPlatformUser) {
    return this.auth.me(user);
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
    };
  }

  private toClientSession<T>(
    request: Request,
    response: Response,
    result: T,
  ):
    | T
    | Omit<
        T & { accessToken: string; refreshToken: string },
        'accessToken' | 'refreshToken'
      > {
    if (
      !isWebAuthRequest(request) ||
      !result ||
      typeof result !== 'object' ||
      !('accessToken' in result) ||
      !('refreshToken' in result)
    ) {
      return result;
    }

    const session = result as T & {
      accessToken: string;
      refreshToken: string;
    };
    setBrowserSessionCookies(response, session, 'platform');
    return withoutSessionTokens(session);
  }
}
