import type { PrismaTransaction } from '../../shared/database/prisma.service';

export async function bumpRuntimeConfigVersion(
  tx: PrismaTransaction,
  tenantId: string,
) {
  const settings = await tx.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, runtimeConfigVersion: 2 },
    update: { runtimeConfigVersion: { increment: 1 } },
    select: { runtimeConfigVersion: true },
  });
  return settings.runtimeConfigVersion;
}
