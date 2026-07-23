export class ReplacePolicyAssignmentsCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly dto: any,
  ) {}
}
