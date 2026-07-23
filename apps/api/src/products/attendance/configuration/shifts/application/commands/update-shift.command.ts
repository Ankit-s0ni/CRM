import { UpdateShiftDto } from '../../../dto/attendance-config.dto';

export class UpdateShiftCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly dto: UpdateShiftDto,
    public readonly updatedBy: string,
  ) {}
}
