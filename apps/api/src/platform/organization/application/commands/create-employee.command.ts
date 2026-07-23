import { CreateEmployeeDto } from '../../dto/create-employee.dto';

export class CreateEmployeeCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: CreateEmployeeDto,
    public readonly createdBy: string,
  ) {}
}
