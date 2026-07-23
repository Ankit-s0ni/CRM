export class AssignEmployeePolicyCommand {
  constructor(
    public readonly employeeId: string,
    public readonly tenantId: string,
    public readonly policyId: string | null,
  ) {}
}
