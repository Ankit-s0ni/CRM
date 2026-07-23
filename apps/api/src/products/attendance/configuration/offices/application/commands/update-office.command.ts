import { UpdateOfficeDto } from '../../../dto/attendance-config.dto';

export class UpdateOfficeCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly dto: UpdateOfficeDto,
    public readonly updatedBy: string,
  ) {}
}
