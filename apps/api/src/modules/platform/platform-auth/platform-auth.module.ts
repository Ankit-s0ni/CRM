import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformDatabaseService } from './platform-database.service';
import { PlatformJwtGuard } from './platform-jwt.guard';
import { PlatformJwtStrategy } from './platform-jwt.strategy';
import { PlatformPermissionGuard } from './platform-permission.guard';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [PlatformAuthController],
  providers: [
    PlatformAuthService,
    PlatformDatabaseService,
    PlatformJwtStrategy,
    PlatformJwtGuard,
    PlatformPermissionGuard,
  ],
  exports: [
    PlatformAuthService,
    PlatformDatabaseService,
    PlatformJwtGuard,
    PlatformPermissionGuard,
  ],
})
export class PlatformAuthModule {}
