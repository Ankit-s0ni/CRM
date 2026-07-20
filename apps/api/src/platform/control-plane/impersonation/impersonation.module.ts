import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationJwtStrategy } from './impersonation-jwt.strategy';
import { ImpersonationService } from './impersonation.service';

@Module({
  imports: [PlatformAuthModule, JwtModule.register({})],
  controllers: [ImpersonationController],
  providers: [ImpersonationJwtStrategy, ImpersonationService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
