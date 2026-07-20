import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import {
  PlatformLoginDto,
  PlatformRefreshDto,
  VerifyPlatformMfaDto,
} from './dto/platform-auth.dto';
import { PlatformAuthService } from './platform-auth.service';
import type { AuthenticatedPlatformUser } from './platform-auth.types';
import { PlatformJwtGuard } from './platform-jwt.guard';

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
  login(@Body() body: PlatformLoginDto, @Req() request: Request) {
    return this.auth.login(body.email, body.password, this.metadata(request));
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete platform login using a TOTP code' })
  verifyMfa(@Body() body: VerifyPlatformMfaDto, @Req() request: Request) {
    return this.auth.verifyMfa(
      body.challengeToken,
      body.code,
      this.metadata(request),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a platform refresh token' })
  refresh(@Body() body: PlatformRefreshDto, @Req() request: Request) {
    return this.auth.refresh(body.refreshToken, this.metadata(request));
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
  logout(
    @CurrentUser() user: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.auth.logout(user, this.metadata(request));
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
}
