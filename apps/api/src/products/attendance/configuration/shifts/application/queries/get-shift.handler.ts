import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetShiftQuery } from './get-shift.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IShiftRepository } from '../../domain/shift.repository.interface';
import { serializeShift } from '../../../attendance-config.rules';

@QueryHandler(GetShiftQuery)
export class GetShiftHandler implements IQueryHandler<GetShiftQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(query: GetShiftQuery) {
    const { id, tenantId } = query;
    return this.prisma.forTenant(async (tx) => {
      const shift = await this.shiftRepository.findById(id, tenantId, tx);
      if (!shift) throw new NotFoundException('Shift not found');
      return { data: serializeShift(shift) };
    });
  }
}
