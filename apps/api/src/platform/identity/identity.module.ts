import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { VerificationTokensService } from './verification-tokens.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { JwtTenantGuard } from './jwt-tenant.guard';
import { WorkspaceSettingsModule } from '../workspace/public';
import { NotificationsModule } from '../notifications/public';

@Module({
  imports: [
    DatabaseModule,
    WorkspaceSettingsModule,
    NotificationsModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'super-secret-default-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtTenantGuard,
    VerificationTokensService,
  ],
  exports: [AuthService, JwtTenantGuard, VerificationTokensService],
})
export class IdentityModule {}
