import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListHolidaysQuery } from './list-holidays.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IHolidayRepository } from '../../domain/holiday.repository.interface';

@QueryHandler(ListHolidaysQuery)
export class ListHolidaysHandler implements IQueryHandler<ListHolidaysQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IHolidayRepository) private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(query: ListHolidaysQuery) {
    const { tenantId } = query;
    return this.prisma.forTenant(async (tx) => {
      const holidays = await this.holidayRepository.findMany(tenantId, tx);
      return { data: holidays };
    });
  }
}
