export class BulkResolveShiftsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly employeeIds: string[],
    public readonly date: string,
  ) {}
}
