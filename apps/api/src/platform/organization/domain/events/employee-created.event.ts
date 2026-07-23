export class EmployeeCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly createdBy: string,
    public readonly payload: any,
  ) {}
}
