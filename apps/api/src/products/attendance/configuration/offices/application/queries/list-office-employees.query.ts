export class ListOfficeEmployeesQuery {
  constructor(
    public readonly officeId: string,
    public readonly tenantId: string,
  ) {}
}
