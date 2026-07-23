import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { ListOfficeEmployeesQuery } from './list-office-employees.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../../domain/office.repository.interface';

@QueryHandler(ListOfficeEmployeesQuery)
export class ListOfficeEmployeesHandler implements IQueryHandler<ListOfficeEmployeesQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(query: ListOfficeEmployeesQuery) {
    const { officeId, tenantId } = query;
    return this.prisma.forTenant(async (tx) => {
      const office = await this.officeRepository.findBasicById(officeId, tenantId, tx);
      if (!office) throw new NotFoundException('Office not found');

      const data = await this.officeRepository.findAssignmentsByOffice(officeId, tenantId, tx);
      return { data };
    });
  }
}
