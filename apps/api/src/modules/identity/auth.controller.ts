import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { VerificationTokensService } from './verification-tokens.service';
import { JwtTenantGuard } from './jwt-tenant.guard';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import {
  EmailDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignupDto,
  VerifyTokenDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verificationTokensService: VerificationTokensService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tenant workspace and admin account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        workEmail: { type: 'string' },
        password: { type: 'string' },
        subdomain: { type: 'string' },
        employeeCount: { type: 'string' },
      },
    },
  })
  async signup(@Body() body: SignupDto) {
    return this.authService.signup({
      companyName: body.companyName,
      workEmail: body.workEmail,
      password: body.password,
      subdomain: body.subdomain,
      employeeCount: body.employeeCount,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login to the application' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Successful login' })
  async login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(
      body.email,
      body.password,
      req.ip,
      req.headers['user-agent'],
      body.deviceUuid,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { refreshToken: { type: 'string' } },
    },
  })
  async refresh(@Body() body: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(
      body.refreshToken,
      req.ip,
      req.headers['user-agent'],
      body.deviceUuid,
    );
  }

  @Post('logout')
  @UseGuards(JwtTenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current refresh token' })
  async logout(
    @Body() body: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.logout(user.userId, body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user and workspace session' })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.userId);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiBody({
    schema: { type: 'object', properties: { email: { type: 'string' } } },
  })
  async requestPasswordReset(@Body() body: EmailDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a verification token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  async confirmPasswordReset(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume a verification token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { token: { type: 'string' }, type: { type: 'string' } },
    },
  })
  async verifyToken(@Body() body: VerifyTokenDto) {
    return this.authService.verifyToken(body.token, body.type);
  }

  @Post('verify/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
      },
    },
  })
  async resendVerification(@Body() body: EmailDto, @Req() req: Request) {
    const tenantId = req.headers['x-tenant-id'];
    if (typeof tenantId !== 'string' || !tenantId) {
      throw new UnauthorizedException('Tenant header required');
    }

    return this.authService.resendEmailVerification(body.email, tenantId);
  }
}
