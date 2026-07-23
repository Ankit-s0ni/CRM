import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { AssignEmployeePolicyCommand } from './assign-employee-policy.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';
import { AuditService } from '../../../../../../platform/audit/public';
import { PolicyResolverCache } from '../../../policy-resolver-cache.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';

@CommandHandler(AssignEmployeePolicyCommand)
export class AssignEmployeePolicyHandler implements ICommandHandler<AssignEmployeePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyCache: PolicyResolverCache,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(command: AssignEmployeePolicyCommand) {
    const { employeeId, tenantId, policyId } = command;

    const result = await this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          status: true,
          officeAssignments: { select: { id: true }, take: 1 },
        },
      });
      if (!employee || employee.status !== 'ACTIVE') {
        throw new NotFoundException('Employee not found');
      }

      const policy = policyId
        ? await this.policyRepository.findById(policyId, tenantId, tx)
        : null;
      if (policyId && !policy) throw new NotFoundException('Policy not found');

      if (
        policy?.locationMode === 'OFFICE_GEOFENCE' &&
        !employee.officeAssignments.length
      ) {
        throw new BadRequestException({
          code: 'OFFICE_CONFIGURATION_REQUIRED',
          message: 'Assign an office to this employee before applying an office-geofence policy',
        });
      }

      const previous = await this.policyRepository.findEmployeeAssignments(employeeId, tx);
      await this.policyRepository.deleteAssignmentsByEmployee(employeeId, tx);

      const assignment = policyId
        ? await this.policyRepository.createAssignment({
            tenantId,
            policyId,
            scope: 'EMPLOYEE',
            employeeId,
          }, tx)
        : null;

      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.employee.policy.assigned',
        module: 'ATTENDANCE',
        entityType: 'Employee',
        entityId: employeeId,
        oldValue: previous,
        newValue: assignment,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);
      
      return {
        data: {
          employeeId,
          assignment,
          policy,
          inheritanceMode: policy ? 'EMPLOYEE' : 'INHERITED',
        },
      };
    });

    await this.policyCache.invalidate(tenantId);
    return result;
  }
}
