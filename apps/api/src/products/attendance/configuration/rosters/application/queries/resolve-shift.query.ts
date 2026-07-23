export class ResolveShiftQuery {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly date: string,
  ) {}
}
