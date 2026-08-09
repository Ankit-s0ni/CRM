import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../shared/database/database.module';
import { TenancyModule } from '../tenancy/public';
import { JwtStrategy } from './jwt.strategy';
import { JwtTenantGuard } from './jwt-tenant.guard';

@Global()
@Module({
  imports: [
    DatabaseModule,
    TenancyModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'super-secret-default-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [JwtStrategy, JwtTenantGuard],
  exports: [JwtModule, JwtTenantGuard],
})
export class TenantAuthenticationModule {}
