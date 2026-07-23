import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { UpdatePolicyCommand } from './update-policy.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { Prisma } from '@prisma/client';
import { normalizeName, assertPolicyRules } from '../../../attendance-config.rules';
import { normalizeWeeklyOffs } from '../../../../../../platform/workspace/public';
import { canEnforceBiometrics } from '../../../../../../shared/config/production-runtime-config';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';
import { AuditService } from '../../../../../../platform/audit/public';
import { PolicyResolverCache } from '../../../policy-resolver-cache.service';
import { IPolicyRepository } from '../../domain/policy.repository.interface';

@CommandHandler(UpdatePolicyCommand)
export class UpdatePolicyHandler implements ICommandHandler<UpdatePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyCache: PolicyResolverCache,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(command: UpdatePolicyCommand) {
    const { id, tenantId, dto } = command;

    const result = await this.prisma.forTenant(async (tx) => {
      const current = await this.policyRepository.findById(id, tenantId, tx);
      if (!current) throw new NotFoundException('Policy not found');

      const data = this.policyData(current, dto);

      await this.validatePolicyCapabilities(tx, data, tenantId);

      const existing = await this.policyRepository.findByName(data.name, tenantId, id, tx);
      if (existing) {
        throw new ConflictException({
          code: 'POLICY_NAME_EXISTS',
          message: 'A policy with this name already exists',
        });
      }

      const policy = await this.policyRepository.update(id, data, tx);

      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.policy.updated',
        module: 'ATTENDANCE',
        entityType: 'AttendancePolicy',
        entityId: id,
        oldValue: current,
        newValue: policy,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: policy };
    });

    await this.policyCache.invalidate(tenantId);
    return result;
  }

  private policyData(current: any, dto: any) {
    const locationMode = dto.locationMode ?? (dto.requireGeofence === undefined ? current.locationMode : (dto.requireGeofence ? 'OFFICE_GEOFENCE' : 'NONE'));
    const selfieMode = dto.selfieMode ?? (dto.requireFaceMatch === undefined ? current.selfieMode : (dto.requireFaceMatch ? 'REQUIRED' : 'DISABLED'));
    
    const data = {
      name: dto.name ? normalizeName(dto.name) : current.name,
      lateAfterMinutes: dto.lateAfterMinutes ?? current.lateAfterMinutes,
      halfDayAfterMinutes: dto.halfDayAfterMinutes ?? current.halfDayAfterMinutes,
      minimumWorkMinutes: dto.minimumWorkMinutes ?? current.minimumWorkMinutes,
      overtimeAfterMinutes: dto.overtimeAfterMinutes ?? current.overtimeAfterMinutes,
      allowEarlyCheckin: dto.allowEarlyCheckin ?? current.allowEarlyCheckin,
      allowEarlyCheckout: dto.allowEarlyCheckout ?? current.allowEarlyCheckout,
      requireFaceMatch: selfieMode === 'REQUIRED',
      allowBiometricOptOut: dto.allowBiometricOptOut ?? current.allowBiometricOptOut,
      requireRegisteredDevice: dto.requireRegisteredDevice ?? current.requireRegisteredDevice,
      requireGeofence: locationMode !== 'NONE',
      locationMode,
      selfieMode,
      fieldTrackingEnabled: dto.fieldTrackingEnabled ?? current.fieldTrackingEnabled,
      allowHybridFieldTracking: dto.allowHybridFieldTracking ?? current.allowHybridFieldTracking,
      maxOfflineSyncHours: dto.maxOfflineSyncHours ?? current.maxOfflineSyncHours,
      maxFaceAttempts: dto.maxFaceAttempts ?? current.maxFaceAttempts,
      weeklyOffs: dto.weeklyOffs === undefined ? current.weeklyOffs : (dto.weeklyOffs == null ? Prisma.JsonNull : (normalizeWeeklyOffs(dto.weeklyOffs) as Prisma.InputJsonValue)),
      breakRules: dto.breakRules ?? (current.breakRules as Record<string, unknown>),
    };

    if (data.selfieMode === 'REQUIRED' && !canEnforceBiometrics()) {
      throw new BadRequestException({
        code: 'BIOMETRICS_NOT_CERTIFIED',
        message: 'Face matching cannot be required until production biometric certification is enabled',
      });
    }

    assertPolicyRules(data);
    return data;
  }

  private async validatePolicyCapabilities(tx: any, policy: any, tenantId: string) {
    if (policy.selfieMode === 'REQUIRED' && !canEnforceBiometrics()) {
      throw new BadRequestException({
        code: 'BIOMETRIC_PROVIDER_UNAVAILABLE',
        message: 'Face verification is not available in this environment',
      });
    }
    if (!policy.fieldTrackingEnabled && policy.locationMode !== 'FIELD_GPS') return;

    const entitled = await tx.tenantModule.findFirst({
      where: {
        tenantId,
        isActive: true,
        module: { key: 'FIELD_TRACKING', availability: 'AVAILABLE' },
      },
      select: { id: true },
    });
    if (!entitled) {
      throw new BadRequestException({
        code: 'MODULE_ACCESS_DENIED',
        message: 'FIELD_TRACKING must be entitled before enabling this policy',
      });
    }
  }
}
