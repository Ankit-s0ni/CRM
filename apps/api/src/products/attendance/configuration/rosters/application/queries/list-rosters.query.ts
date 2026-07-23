import { RosterQueryDto } from '../../../dto/attendance-config.dto';

export class ListRostersQuery {
  constructor(
    public readonly tenantId: string,
    public readonly query: RosterQueryDto,
  ) {}
}
