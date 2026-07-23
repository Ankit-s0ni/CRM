import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject } from '@nestjs/common';
import { BulkResolvePoliciesQuery } from './bulk-resolve-policies.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';
import { resolvePolicy } from '../../../attendance-config.rules';

@QueryHandler(BulkResolvePoliciesQuery)
export class BulkResolvePoliciesHandler implements IQueryHandler<BulkResolvePoliciesQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(query: BulkResolvePoliciesQuery) {
    const { employeeIds, tenantId, date } = query;

    return this.prisma.forTenant(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds }, status: 'ACTIVE' },
        select: { id: true, deptId: true },
      });

      if (employees.length !== new Set(employeeIds).size) {
        throw new NotFoundException('Employee not found');
      }

      const deptIds = [
        ...new Set(employees.flatMap(({ deptId }) => (deptId ? [deptId] : []))),
      ];

      const assignments = await this.policyRepository.findAssignmentsForResolution(employeeIds, deptIds, tx);

      return {
        data: employees.map((employee) => {
          const resolved = resolvePolicy(
            assignments
              .filter(
                (assignment) =>
                  assignment.scope === 'TENANT_DEFAULT' ||
                  (assignment.scope === 'DEPARTMENT' &&
                    assignment.deptId === employee.deptId) ||
                  (assignment.scope === 'EMPLOYEE' &&
                    assignment.employeeId === employee.id),
              )
              .map((assignment: any) => ({
                scope: assignment.scope,
                value: assignment,
              })),
          );

          if (!resolved) throw new NotFoundException('Configuration not found');

          return {
            employeeId: employee.id,
            policy: resolved.value.policy,
            resolution: {
              source: resolved.scope,
              assignmentId: resolved.value.id,
              effectiveDate: date,
            },
          };
        }),
      };
    });
  }
}
