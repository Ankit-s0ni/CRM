export class RemoveRosterCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly deletedBy: string,
  ) {}
}
