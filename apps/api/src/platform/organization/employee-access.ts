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
