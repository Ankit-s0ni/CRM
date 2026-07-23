import { AssignOfficeEmployeesDto } from '../../../dto/attendance-config.dto';

export class ReplaceOfficeEmployeesCommand {
  constructor(
    public readonly officeId: string,
    public readonly tenantId: string,
    public readonly dto: AssignOfficeEmployeesDto,
    public readonly replacedBy: string,
  ) {}
}
