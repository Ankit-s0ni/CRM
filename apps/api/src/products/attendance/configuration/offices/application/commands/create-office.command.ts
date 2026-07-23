import { CreateOfficeDto } from '../../../dto/attendance-config.dto';

export class CreateOfficeCommand {
  constructor(
    public readonly tenantId: string,
    public readonly dto: CreateOfficeDto,
    public readonly createdBy: string,
  ) {}
}
