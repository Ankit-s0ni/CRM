export class GetPolicyQuery {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
  ) {}
}
