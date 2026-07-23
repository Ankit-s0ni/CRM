import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetOfficeQuery } from './get-office.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../../domain/office.repository.interface';

@QueryHandler(GetOfficeQuery)
export class GetOfficeHandler implements IQueryHandler<GetOfficeQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(query: GetOfficeQuery) {
    const { id, tenantId } = query;
    return this.prisma.forTenant(async (tx) => {
      const office = await this.officeRepository.findById(id, tenantId, tx);
      if (!office) throw new NotFoundException('Office not found');
      return { data: office };
    });
  }
}
