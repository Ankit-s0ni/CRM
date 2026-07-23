import { CreateShiftDto } from '../../../dto/attendance-config.dto';

export class CreateShiftCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: CreateShiftDto,
    public readonly createdBy: string,
  ) {}
}
