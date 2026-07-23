import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { GetPolicyQuery } from './get-policy.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';

@QueryHandler(GetPolicyQuery)
export class GetPolicyHandler implements IQueryHandler<GetPolicyQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(query: GetPolicyQuery) {
    return this.prisma.forTenant(async (tx) => {
      const policy = await this.policyRepository.findById(query.id, query.tenantId, tx);
      if (!policy) throw new NotFoundException('Policy not found');
      return { data: policy };
    });
  }
}
