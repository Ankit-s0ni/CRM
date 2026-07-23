import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CreatePolicyCommand } from './create-policy.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { Prisma } from '@prisma/client';
import { normalizeName, assertPolicyRules } from '../../../attendance-config.rules';
import { normalizeWeeklyOffs } from '../../../../../../platform/workspace/public';
import { canEnforceBiometrics } from '../../../../../../shared/config/production-runtime-config';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';
import { AuditService } from '../../../../../../platform/audit/public';
import { PolicyResolverCache } from '../../../policy-resolver-cache.service';

import { IPolicyRepository } from '../../domain/policy.repository.interface';

@CommandHandler(CreatePolicyCommand)
export class CreatePolicyHandler implements ICommandHandler<CreatePolicyCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyCache: PolicyResolverCache,
    @Inject(IPolicyRepository) private readonly policyRepository: IPolicyRepository,
  ) {}

  async execute(command: CreatePolicyCommand) {
    const { tenantId, dto } = command;
    const data = this.policyData(dto);

    const result = await this.prisma.forTenant(async (tx) => {
      await this.validatePolicyCapabilities(tx, data, tenantId);

      const existing = await this.policyRepository.findByName(data.name, tenantId, undefined, tx);
      if (existing) {
        throw new ConflictException({
          code: 'POLICY_NAME_EXISTS',
          message: 'A policy with this name already exists',
        });
      }

      const policy = await this.policyRepository.create({ tenantId, ...data }, tx);

      await this.audit.append(tx, {
        tenantId,
        action: 'attendance.policy.created',
        module: 'ATTENDANCE',
        entityType: 'AttendancePolicy',
        entityId: policy.id,
        newValue: policy,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);
      return { data: policy };
    });

    await this.policyCache.invalidate(tenantId);
    return result;
  }

  private policyData(dto: any) {
    const locationMode = dto.locationMode ?? (dto.requireGeofence === false ? 'NONE' : 'OFFICE_GEOFENCE');
    const selfieMode = dto.selfieMode ?? (dto.requireFaceMatch ? 'REQUIRED' : 'DISABLED');
    
    const data = {
      name: normalizeName(dto.name),
      lateAfterMinutes: dto.lateAfterMinutes ?? 15,
      halfDayAfterMinutes: dto.halfDayAfterMinutes ?? 240,
      minimumWorkMinutes: dto.minimumWorkMinutes ?? 480,
      overtimeAfterMinutes: dto.overtimeAfterMinutes ?? 540,
      allowEarlyCheckin: dto.allowEarlyCheckin ?? true,
      allowEarlyCheckout: dto.allowEarlyCheckout ?? false,
      requireFaceMatch: selfieMode === 'REQUIRED',
      allowBiometricOptOut: dto.allowBiometricOptOut ?? false,
      requireRegisteredDevice: dto.requireRegisteredDevice ?? true,
      requireGeofence: locationMode !== 'NONE',
      locationMode,
      selfieMode,
      fieldTrackingEnabled: dto.fieldTrackingEnabled ?? false,
      allowHybridFieldTracking: dto.allowHybridFieldTracking ?? false,
      maxOfflineSyncHours: dto.maxOfflineSyncHours ?? 48,
      maxFaceAttempts: dto.maxFaceAttempts ?? 3,
      weeklyOffs: dto.weeklyOffs == null ? Prisma.JsonNull : (normalizeWeeklyOffs(dto.weeklyOffs) as Prisma.InputJsonValue),
      breakRules: (dto.breakRules ?? {}) as Prisma.InputJsonValue,
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
