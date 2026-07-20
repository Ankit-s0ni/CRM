import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../../shared/database/database.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformJwtGuard } from './platform-jwt.guard';
import { PlatformJwtStrategy } from './platform-jwt.strategy';
import { PlatformPermissionGuard } from './platform-permission.guard';

@Module({
  imports: [DatabaseModule, PassportModule, JwtModule.register({})],
  controllers: [PlatformAuthController],
  providers: [
    PlatformAuthService,
    PlatformJwtStrategy,
    PlatformJwtGuard,
    PlatformPermissionGuard,
  ],
  exports: [PlatformAuthService, PlatformJwtGuard, PlatformPermissionGuard],
})
export class PlatformAuthModule {}
