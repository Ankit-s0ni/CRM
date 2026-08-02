import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/public';
import { TenantContextService } from '../tenancy/public';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { CompleteOnboardingDto } from './dto/workspace-settings.dto';
import {
  FINAL_ONBOARDING_STEP,
  completedOnboardingSteps,
  missingRequiredOnboardingSteps,
  type OnboardingReadiness,
  resolveCurrentOnboardingStep,
} from './workspace-onboarding.rules';

@Injectable()
export class WorkspaceOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  status() {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const snapshot = await this.snapshot(tx, tenantId);
      return { data: this.statusData(snapshot) };
    });
  }

  complete(dto: CompleteOnboardingDto) {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const snapshot = await this.snapshot(tx, tenantId);
      if (!snapshot.tenant) {
        throw new BadRequestException({
          code: 'WORKSPACE_NOT_FOUND',
          message: 'Workspace not found',
        });
      }
      if (snapshot.tenant.onboardingCompletedAt) {
        return {
          data: {
            completed: true,
            completedAt: snapshot.tenant.onboardingCompletedAt,
          },
        };
      }

      const missingSteps = missingRequiredOnboardingSteps(snapshot.readiness);
      if (missingSteps.length > 0) {
        throw new BadRequestException({
          code: 'ONBOARDING_INCOMPLETE',
          message: 'Complete the required workspace setup before finishing',
          details: { missingSteps },
        });
      }

      const completedAt = new Date();
      const completion = await tx.tenant.updateMany({
        where: { id: tenantId, onboardingCompletedAt: null },
        data: { onboardingCompletedAt: completedAt },
      });
      if (completion.count === 0) {
        const current = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { onboardingCompletedAt: true },
        });
        if (current?.onboardingCompletedAt) {
          return {
            data: {
              completed: true,
              completedAt: current.onboardingCompletedAt,
            },
          };
        }
        throw new BadRequestException({
          code: 'WORKSPACE_NOT_FOUND',
          message: 'Workspace not found',
        });
      }
      await this.audit.append(tx, {
        tenantId,
        action: 'workspace.onboarding.completed',
        module: 'WORKSPACE',
        entityType: 'Tenant',
        entityId: tenantId,
        newValue: {
          completedAt,
          completedSteps: completedOnboardingSteps(snapshot.readiness),
          progress: dto.progress,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventKey: 'workspace.onboarding.completed',
        payload: { tenantId, completedAt: completedAt.toISOString() },
      });
      return { data: { completed: true, completedAt } };
    });
  }

  private async snapshot(tx: PrismaTransaction, tenantId: string) {
    const [tenant, settings, departments, designations, validOffices] =
      await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { onboardingCompletedAt: true },
        }),
        tx.tenantSettings.findUnique({ where: { tenantId } }),
        tx.department.count(),
        tx.designation.count(),
        tx.officeLocation.count({
          where: {
            timezone: { not: null },
            countryCode: { not: null },
            radiusMeters: { gte: 25, lte: 10_000 },
          },
        }),
      ]);

    const readiness: OnboardingReadiness = {
      company: Boolean(settings?.timezone && settings.locale),
      organization: departments > 0 && designations > 0,
      office: validOffices > 0,
      workingDays: Boolean(
        settings &&
        this.validTime(settings.workingDayStart) &&
        this.validTime(settings.workingDayEnd) &&
        Array.isArray(settings.weeklyOffs),
      ),
      attendancePolicy: Boolean(
        settings &&
        settings.faceMatchThreshold >= 0 &&
        settings.faceMatchThreshold <= 100 &&
        settings.fieldTrackingIntervalMin >= 1 &&
        settings.fieldTrackingIntervalMin <= 120 &&
        settings.checkoutReminderMinutes >= 1 &&
        settings.checkoutReminderMinutes <= 120 &&
        this.validTime(settings.absenteeAlertTime),
      ),
      hrInvite: true,
    };

    return { tenant, settings, readiness };
  }

  private statusData(
    snapshot: Awaited<ReturnType<WorkspaceOnboardingService['snapshot']>>,
  ) {
    const completed = Boolean(snapshot.tenant?.onboardingCompletedAt);
    const currentStep = completed
      ? FINAL_ONBOARDING_STEP
      : resolveCurrentOnboardingStep(
          snapshot.settings?.onboardingStep,
          snapshot.settings?.onboardingVersion,
          snapshot.readiness,
        );
    return {
      completed,
      currentStep,
      onboardingVersion: snapshot.settings?.onboardingVersion ?? 1,
      steps: snapshot.readiness,
      missingSteps: completed
        ? []
        : missingRequiredOnboardingSteps(snapshot.readiness),
    };
  }

  private validTime(value: string | null | undefined) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  private tenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }
    return tenantId;
  }
}
