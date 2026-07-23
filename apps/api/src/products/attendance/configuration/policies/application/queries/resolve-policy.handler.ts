import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { ResolvePolicyQuery } from './resolve-policy.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { PolicyResolverCache } from '../../../policy-resolver-cache.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';
import { resolvePolicy } from '../../../attendance-config.rules';

@QueryHandler(ResolvePolicyQuery)
export class ResolvePolicyHandler implements IQueryHandler<ResolvePolicyQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyCache: PolicyResolverCache,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(query: ResolvePolicyQuery) {
    const { employeeId, tenantId, date } = query;

    const cached = await this.policyCache.get(tenantId, employeeId, date);
    if (cached.value !== undefined) return cached.value;

    const value = await this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, deptId: true },
      });
      if (!employee) throw new NotFoundException('Employee not found');

      const deptIds = employee.deptId ? [employee.deptId] : [];
      const assignments = await this.policyRepository.findAssignmentsForResolution([employeeId], deptIds, tx);

      const resolved = resolvePolicy(
        assignments.map((assignment: any) => ({
          scope: assignment.scope,
          value: assignment,
        })),
      );

      if (!resolved) throw new NotFoundException('Configuration not found');

      return {
        data: resolved.value.policy,
        resolution: {
          source: resolved.scope,
          assignmentId: resolved.value.id,
          effectiveDate: date,
        },
      };
    });

    await this.policyCache.set(
      tenantId,
      employeeId,
      date,
      cached.generation,
      value,
    );
    return value;
  }
}
