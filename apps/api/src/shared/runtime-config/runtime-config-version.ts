import type { PrismaTransaction } from '../database/prisma.service';
import type { PlatformTransaction } from '../database/platform-database.service';

export async function bumpRuntimeConfigVersion(
  tx: PrismaTransaction | PlatformTransaction,
  tenantId: string,
) {
  const tenantSettings = tx.tenantSettings as unknown as {
    upsert(input: {
      where: { tenantId: string };
      create: { tenantId: string; runtimeConfigVersion: number };
      update: { runtimeConfigVersion: { increment: number } };
      select: { runtimeConfigVersion: true };
    }): Promise<{ runtimeConfigVersion: number }>;
  };
  const settings = await tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, runtimeConfigVersion: 2 },
    update: { runtimeConfigVersion: { increment: 1 } },
    select: { runtimeConfigVersion: true },
  });
  return settings.runtimeConfigVersion;
}
