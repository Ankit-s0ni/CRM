import { UpdateEmployeeAssignmentsDto } from '../../dto/update-employee-assignments.dto';

export class UpdateEmployeeAssignmentsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly dto: UpdateEmployeeAssignmentsDto,
  ) {}
}
