import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { ReplacePolicyAssignmentsCommand } from './replace-policy-assignments.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { Prisma } from '@prisma/client';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';
import { AuditService } from '../../../../../../platform/audit/public';
import { PolicyResolverCache } from '../../../policy-resolver-cache.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';

@CommandHandler(ReplacePolicyAssignmentsCommand)
export class ReplacePolicyAssignmentsHandler implements ICommandHandler<ReplacePolicyAssignmentsCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyCache: PolicyResolverCache,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(command: ReplacePolicyAssignmentsCommand) {
    const { id, tenantId, dto } = command;

    this.validatePolicyAssignments(dto);

    const result = await this.prisma.forTenant(async (tx) => {
      const policy = await this.policyRepository.findById(id, tenantId, tx);
      if (!policy) throw new NotFoundException('Policy not found');

      await this.validateAssignmentTargets(tx, dto);
      await this.validatePolicyActivation(tx, id, dto);

      const oldValue = await this.policyRepository.findAssignmentsByPolicy(id, tx);
      await this.policyRepository.deleteAssignmentsByPolicy(id, tx);

      if (dto.assignments.length) {
        try {
          await this.policyRepository.createAssignments({
            data: dto.assignments.map((assignment: any) => ({
              tenantId,
              policyId: id,
              scope: assignment.scope,
              deptId: assignment.deptId ?? null,
              employeeId: assignment.employeeId ?? null,
            })),
          }, tx);
        } catch (error) {
          if (this.isUniqueError(error)) {
            throw new ConflictException({
              code: 'POLICY_ASSIGNMENT_CONFLICT',
              message: 'An assignment already exists at this scope',
            });
          }
          throw error;
        }
      }

      const assignments = await this.policyRepository.findAssignmentsByPolicy(id, tx);

      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.policy.assignments.replaced',
        module: 'ATTENDANCE',
        entityType: 'AttendancePolicy',
        entityId: id,
        oldValue,
        newValue: assignments,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: assignments };
    });

    await this.policyCache.invalidate(tenantId);
    return result;
  }

  private validatePolicyAssignments(dto: any) {
    if (
      dto.assignments.some(
        (assignment: any) =>
          (assignment.scope === 'TENANT' &&
            (assignment.deptId || assignment.employeeId)) ||
          (assignment.scope === 'DEPARTMENT' &&
            (!assignment.deptId || assignment.employeeId)) ||
          (assignment.scope === 'EMPLOYEE' &&
            (!assignment.employeeId || assignment.deptId)),
      )
    ) {
      throw new ConflictException({
        code: 'POLICY_ASSIGNMENT_CONFLICT',
        message: 'Policy assignment scope and target are invalid or duplicated',
      });
    }
  }

  private async validateAssignmentTargets(tx: any, dto: any) {
    const deptIds = dto.assignments.flatMap((item: any) =>
      item.deptId ? [item.deptId] : [],
    );
    const employeeIds = dto.assignments.flatMap((item: any) =>
      item.employeeId ? [item.employeeId] : [],
    );
    const [departments, employees] = await Promise.all([
      tx.department.count({ where: { id: { in: deptIds } } }),
      tx.employee.count({
        where: { id: { in: employeeIds }, status: 'ACTIVE' },
      }),
    ]);
    if (departments !== deptIds.length || employees !== employeeIds.length) {
      throw new NotFoundException('Configuration not found');
    }
  }

  private async validatePolicyActivation(tx: any, policyId: string, dto: any) {
    if (!dto.assignments.length) return;
    const policy = await tx.attendancePolicy.findUnique({
      where: { id: policyId },
      select: { locationMode: true },
    });
    if (policy?.locationMode === 'OFFICE_GEOFENCE') {
      for (const assignment of dto.assignments) {
        if (assignment.scope === 'EMPLOYEE') {
          const employee = await tx.employee.findUnique({
            where: { id: assignment.employeeId },
            include: { officeAssignments: { select: { id: true }, take: 1 } },
          });
          if (!employee?.officeAssignments.length) {
            throw new BadRequestException({
              code: 'OFFICE_CONFIGURATION_REQUIRED',
              message: 'Assign an office to this employee before applying an office-geofence policy',
            });
          }
        }
      }
    }
  }

  private isUniqueError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
