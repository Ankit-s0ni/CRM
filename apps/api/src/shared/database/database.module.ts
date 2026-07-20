import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PlatformDatabaseService } from './platform-database.service';
import { TenancyModule } from '../../platform/tenancy/public';

@Global()
@Module({
  imports: [TenancyModule],
  providers: [PrismaService, PlatformDatabaseService],
  exports: [PrismaService, PlatformDatabaseService],
})
export class DatabaseModule {}
