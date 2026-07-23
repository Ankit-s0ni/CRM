export class RemovePolicyCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
  ) {}
}
