import { CreateRosterDto } from '../../../dto/attendance-config.dto';

export class CreateRosterCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: CreateRosterDto,
    public readonly createdBy: string,
  ) {}
}
