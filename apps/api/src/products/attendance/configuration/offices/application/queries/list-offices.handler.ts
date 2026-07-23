import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListOfficesQuery } from './list-offices.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../../domain/office.repository.interface';

@QueryHandler(ListOfficesQuery)
export class ListOfficesHandler implements IQueryHandler<ListOfficesQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(query: ListOfficesQuery) {
    const { tenantId } = query;
    return this.prisma.forTenant(async (tx) => {
      const data = await this.officeRepository.findMany(tenantId, tx);
      return { data };
    });
  }
}
