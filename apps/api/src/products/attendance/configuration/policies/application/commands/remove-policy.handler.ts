import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { RemovePolicyCommand } from './remove-policy.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';
import { AuditService } from '../../../../../../platform/audit/public';
import { PolicyResolverCache } from '../../../policy-resolver-cache.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';

@CommandHandler(RemovePolicyCommand)
export class RemovePolicyHandler implements ICommandHandler<RemovePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyCache: PolicyResolverCache,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(command: RemovePolicyCommand) {
    const { id, tenantId } = command;

    const result = await this.prisma.forTenant(async (tx) => {
      const policy = await this.policyRepository.findById(id, tenantId, tx);
      if (!policy) throw new NotFoundException('Policy not found');

      if (policy._count?.assignments && policy._count.assignments > 0) {
        throw new ConflictException({
          code: 'POLICY_IN_USE',
          message: 'Cannot delete a policy that has active assignments',
        });
      }

      await this.policyRepository.delete(id, tx);

      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.policy.deleted',
        module: 'ATTENDANCE',
        entityType: 'AttendancePolicy',
        entityId: id,
        oldValue: policy,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);
      return { success: true };
    });

    await this.policyCache.invalidate(tenantId);
    return result;
  }
}
