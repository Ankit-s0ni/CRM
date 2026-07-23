export class RemoveOfficeCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly removedBy: string,
  ) {}
}
