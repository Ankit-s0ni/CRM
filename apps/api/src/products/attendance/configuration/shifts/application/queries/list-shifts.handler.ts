import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListShiftsQuery } from './list-shifts.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IShiftRepository } from '../../domain/shift.repository.interface';
import { serializeShift } from '../../../attendance-config.rules';

@QueryHandler(ListShiftsQuery)
export class ListShiftsHandler implements IQueryHandler<ListShiftsQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(query: ListShiftsQuery) {
    const { tenantId } = query;
    return this.prisma.forTenant(async (tx) => {
      const shifts = await this.shiftRepository.findMany(tenantId, tx);
      return { data: shifts.map(serializeShift) };
    });
  }
}
