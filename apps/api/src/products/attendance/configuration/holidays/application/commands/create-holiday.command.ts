import { CreateHolidayDto } from '../../../dto/attendance-config.dto';

export class CreateHolidayCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: CreateHolidayDto,
    public readonly createdBy: string,
  ) {}
}
