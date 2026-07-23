import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

export type PlatformTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PlatformDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly client: PrismaClient;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL_PLATFORM ??
        process.env.DATABASE_URL ??
        'postgresql://crm_user:crm_password_secure_123@localhost:5432/crm_db?schema=public',
      max: 10,
    });
    this.client = new PrismaClient({ adapter: new PrismaPg(this.pool) });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    await this.pool.end();
  }

  transaction<T>(callback: (tx: PlatformTransaction) => Promise<T>) {
    return this.client.$transaction(async (tx) => callback(tx));
  }
}
