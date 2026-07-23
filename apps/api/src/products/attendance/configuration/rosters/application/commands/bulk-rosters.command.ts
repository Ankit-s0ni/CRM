import { BulkRosterDto } from '../../../dto/attendance-config.dto';

export class BulkRostersCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: BulkRosterDto,
    public readonly createdBy: string,
  ) {}
}
