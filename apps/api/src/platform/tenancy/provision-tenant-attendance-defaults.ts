import { Prisma } from '@prisma/client';

type AttendanceDefaultsTransaction = Pick<
  Prisma.TransactionClient,
  'alertRule' | 'attendancePolicy' | 'policyAssignment' | 'shift'
>;

export async function provisionTenantAttendanceDefaults(
  tx: AttendanceDefaultsTransaction,
  tenantId: string,
) {
  const shift = await tx.shift.upsert({
    where: {
      tenantId_name: { tenantId, name: 'Morning 09:00-18:00' },
    },
    update: {},
    create: {
      tenantId,
      name: 'Morning 09:00-18:00',
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T18:00:00.000Z'),
      isOvernight: false,
    },
  });
  const policy = await tx.attendancePolicy.upsert({
    where: { tenantId_name: { tenantId, name: 'Default Office' } },
    update: {},
    create: { tenantId, name: 'Default Office' },
  });
  const assignment = await tx.policyAssignment.findFirst({
    where: { tenantId, scope: 'TENANT_DEFAULT' },
  });

  if (assignment) {
    await tx.policyAssignment.update({
      where: { id: assignment.id },
      data: { policyId: policy.id },
    });
  } else {
    await tx.policyAssignment.create({
      data: { tenantId, policyId: policy.id, scope: 'TENANT_DEFAULT' },
    });
  }

  await Promise.all(
    [
      'GEOFENCE_VIOLATION',
      'FACE_MISMATCH',
      'MOCK_LOCATION',
      'ROOTED_DEVICE',
      'CLOCK_TAMPER',
      'DEVICE_MISMATCH',
    ].map((ruleType) =>
      tx.alertRule.upsert({
        where: {
          tenantId_ruleType: {
            tenantId,
            ruleType: ruleType as Prisma.AlertRuleCreateInput['ruleType'],
          },
        },
        update: {},
        create: {
          tenantId,
          ruleType: ruleType as Prisma.AlertRuleCreateInput['ruleType'],
          cooldownMinutes: 60,
          channels: ['IN_APP'],
        },
      }),
    ),
  );

  return { policy, shift };
}
