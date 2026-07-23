import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListRostersQuery } from './list-rosters.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../../domain/roster.repository.interface';

@QueryHandler(ListRostersQuery)
export class ListRostersHandler implements IQueryHandler<ListRostersQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IRosterRepository) private readonly rosterRepository: IRosterRepository,
  ) {}

  async execute(query: ListRostersQuery) {
    const { query: dto } = query;
    return this.prisma.forTenant(async (tx) => {
      const rosters = await this.rosterRepository.findMany(
        dto.employeeId,
        dto.startDate,
        dto.endDate,
        tx,
      );
      return { data: rosters };
    });
  }
}
