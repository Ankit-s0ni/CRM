import { UpdateHolidayDto } from '../../../dto/attendance-config.dto';

export class UpdateHolidayCommand {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly dto: UpdateHolidayDto,
    public readonly updatedBy: string,
  ) {}
}
