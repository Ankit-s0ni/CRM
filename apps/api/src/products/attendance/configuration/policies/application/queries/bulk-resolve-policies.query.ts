export class BulkResolvePoliciesQuery {
  constructor(
    public readonly employeeIds: string[],
    public readonly tenantId: string,
    public readonly date: string,
  ) {}
}
