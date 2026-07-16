import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { TenantContextService } from '../tenancy/tenant-context.service';

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;
  private adminPool: Pool;
  private adminClient: PrismaClient;

  constructor(private readonly tenantContextService: TenantContextService) {
    const appConnectionString =
      process.env.DATABASE_URL_APP ||
      process.env.DATABASE_URL ||
      'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public';
    const adminConnectionString =
      process.env.DATABASE_URL ||
      'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

    const pool = new Pool({ connectionString: appConnectionString, max: 20 });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;

    this.adminPool = new Pool({
      connectionString: adminConnectionString,
      max: 10,
    });
    this.adminClient = new PrismaClient({
      adapter: new PrismaPg(this.adminPool),
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.adminClient.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.adminClient.$disconnect();
    await this.pool.end();
    await this.adminPool.end();
  }

  /**
   * Executes a callback within a transaction that has the RLS tenant ID set.
   * This ensures all queries inside the callback are properly scoped.
   */
  async forTenant<T>(
    callback: (tx: PrismaTransaction) => Promise<T>,
  ): Promise<T> {
    const tenantId = this.tenantContextService.tenantId;

    return this.$transaction(async (tx) => {
      if (tenantId) {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}::text, true)`;
      } else {
        // If no tenantId is in context, clear it out explicitly to ensure fail-closed behavior
        await tx.$executeRaw`SELECT set_config('app.tenant_id', '', true)`;
      }
      return callback(tx);
    });
  }

  async forAdmin<T>(
    callback: (tx: PrismaTransaction) => Promise<T>,
  ): Promise<T> {
    return this.adminClient.$transaction(async (tx) => callback(tx));
  }
}
