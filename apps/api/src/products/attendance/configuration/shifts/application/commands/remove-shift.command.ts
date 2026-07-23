export class RemoveShiftCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly deletedBy: string,
  ) {}
}
