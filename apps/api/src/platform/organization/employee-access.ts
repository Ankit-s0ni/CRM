import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';

export type ReportingNode = {
  id: string;
  managerId: string | null;
};

export function collectReportingEmployeeIds(
  managerEmployeeId: string,
  employees: ReportingNode[],
) {
  const reportsByManager = new Map<string, string[]>();
  for (const employee of employees) {
    if (!employee.managerId) continue;
    reportsByManager.set(employee.managerId, [
      ...(reportsByManager.get(employee.managerId) ?? []),
      employee.id,
    ]);
  }

  const result = new Set<string>([managerEmployeeId]);
  const pending = [...(reportsByManager.get(managerEmployeeId) ?? [])];
  while (pending.length > 0) {
    const employeeId = pending.shift()!;
    if (result.has(employeeId)) continue;
    result.add(employeeId);
    pending.push(...(reportsByManager.get(employeeId) ?? []));
  }
  return [...result];
}

export async function resolveAccessibleEmployeeIds(
  tx: PrismaTransaction,
  userId: string,
): Promise<string[] | null> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: {
      employee: { select: { id: true } },
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!user) return [];

  const permissions = new Set(
    user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.key),
    ),
  );
  if (permissions.has(PERMISSIONS.EMPLOYEES_READ)) return null;
  if (!user.employee) return [];

  if (permissions.has(PERMISSIONS.EMPLOYEES_REPORTS_READ)) {
    const employees = await tx.employee.findMany({
      select: { id: true, managerId: true },
    });
    return collectReportingEmployeeIds(user.employee.id, employees);
  }
  if (permissions.has(PERMISSIONS.EMPLOYEES_SELF_READ)) {
    return [user.employee.id];
  }
  return [];
}
