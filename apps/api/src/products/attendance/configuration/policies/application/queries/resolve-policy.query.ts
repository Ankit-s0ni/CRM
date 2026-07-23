export class ResolvePolicyQuery {
  constructor(
    public readonly employeeId: string,
    public readonly tenantId: string,
    public readonly date: string,
  ) {}
}
