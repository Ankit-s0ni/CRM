import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListPoliciesQuery } from './list-policies.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { Inject } from '@nestjs/common';
import { IPolicyRepository } from '../../domain/policy.repository.interface';

@QueryHandler(ListPoliciesQuery)
export class ListPoliciesHandler implements IQueryHandler<ListPoliciesQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(query: ListPoliciesQuery) {
    return this.prisma.forTenant(async (tx) => ({
      data: await this.policyRepository.findMany(query.tenantId, tx),
    }));
  }
}
