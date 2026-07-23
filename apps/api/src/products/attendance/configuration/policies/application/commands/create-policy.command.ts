export class CreatePolicyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: any,
  ) {}
}
