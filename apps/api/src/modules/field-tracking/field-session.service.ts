import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TrackingEndReason } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { RuntimeConfigService } from '../runtime-config/runtime-config.service';
import {
  StartFieldSessionDto,
  StopFieldSessionDto,
} from './dto/field-tracking.dto';

@Injectable()
export class FieldSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly runtimeConfig: RuntimeConfigService,
  ) {}

  async start(dto: StartFieldSessionDto) {
    try {
      return await this.prisma.forTenant(async (tx) => {
        const employee = await this.runtimeConfig.assertFieldTrackingEnabled(
          tx,
          this.requireUserId(),
        );
        const existing = await tx.fieldTrackingSession.findUnique({
          where: {
            tenantId_employeeId_clientStartUuid: {
              tenantId: this.requireTenantId(),
              employeeId: employee.id,
              clientStartUuid: dto.clientStartUuid,
            },
          },
        });
        if (existing)
          return { data: sessionResponse(existing), duplicate: true };

        const device = await tx.registeredDevice.findUnique({
          where: {
            tenantId_deviceUuid: {
              tenantId: this.requireTenantId(),
              deviceUuid: dto.deviceUuid,
            },
          },
        });
        if (
          !device ||
          device.employeeId !== employee.id ||
          device.status !== 'ACTIVE'
        ) {
          throw new ForbiddenException({
            code: 'FIELD_TRACKING_NOT_ALLOWED',
            message: 'An active device bound to this employee is required',
          });
        }
        const active = await tx.fieldTrackingSession.findFirst({
          where: { employeeId: employee.id, endedAt: null },
        });
        if (active) {
          throw new ConflictException({
            code: 'FIELD_SESSION_ALREADY_ACTIVE',
            message: 'A field tracking session is already active',
            details: { sessionId: active.id },
          });
        }
        const session = await tx.fieldTrackingSession.create({
          data: {
            tenantId: this.requireTenantId(),
            employeeId: employee.id,
            deviceId: device.id,
            clientStartUuid: dto.clientStartUuid,
          },
        });
        return { data: sessionResponse(session), duplicate: false };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'FIELD_SESSION_ALREADY_ACTIVE',
          message: 'A field tracking session is already active',
        });
      }
      throw error;
    }
  }

  stop(id: string, dto: StopFieldSessionDto) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.runtimeConfig.assertFieldTrackingEnabled(
        tx,
        this.requireUserId(),
      );
      const session = await tx.fieldTrackingSession.findFirst({
        where: { id, employeeId: employee.id },
      });
      if (!session) {
        throw new NotFoundException({
          code: 'FIELD_SESSION_NOT_FOUND',
          message: 'Field tracking session was not found',
        });
      }
      if (session.endedAt) {
        return { data: sessionResponse(session), duplicate: true };
      }
      const updated = await tx.fieldTrackingSession.update({
        where: { id: session.id },
        data: {
          endedAt: new Date(),
          endReason: dto.endReason,
        },
      });
      return { data: sessionResponse(updated), duplicate: false };
    });
  }

  active() {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.runtimeConfig.assertFieldTrackingEnabled(
        tx,
        this.requireUserId(),
      );
      const session = await tx.fieldTrackingSession.findFirst({
        where: { employeeId: employee.id, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });
      return { data: session ? sessionResponse(session) : null };
    });
  }

  private requireTenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('TENANT_CONTEXT_REQUIRED');
    return tenantId;
  }

  private requireUserId() {
    const userId = this.context.userId;
    if (!userId) throw new Error('USER_CONTEXT_REQUIRED');
    return userId;
  }
}

function sessionResponse(session: {
  id: string;
  deviceId: string;
  clientStartUuid: string;
  startedAt: Date;
  lastPingAt: Date | null;
  endedAt: Date | null;
  endReason: TrackingEndReason | null;
}) {
  return {
    id: session.id,
    deviceId: session.deviceId,
    clientStartUuid: session.clientStartUuid,
    startedAt: session.startedAt,
    lastPingAt: session.lastPingAt,
    endedAt: session.endedAt,
    endReason: session.endReason,
  };
}
