import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VerificationTokensService } from './verification-tokens.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { WorkspaceSettingsModule } from '../workspace/public';
import { NotificationsModule } from '../notifications/public';
import { TenantAuthenticationModule } from './tenant-authentication.module';

@Module({
  imports: [
    DatabaseModule,
    WorkspaceSettingsModule,
    NotificationsModule,
    TenantAuthenticationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    VerificationTokensService,
  ],
  exports: [
    AuthService,
    TenantAuthenticationModule,
    VerificationTokensService,
  ],
})
export class IdentityModule {}
