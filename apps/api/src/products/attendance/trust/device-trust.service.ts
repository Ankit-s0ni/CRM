import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeviceStatus, Prisma, RevokeReason } from '@prisma/client';
import { AuditService } from '../../../platform/audit/public';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { ListDevicesQueryDto, RegisterDeviceDto } from './dto/device.dto';

@Injectable()
export class DeviceTrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  register(dto: RegisterDeviceDto, ipAddress?: string) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employeeForCurrentUser(tx);
      const existing = await tx.registeredDevice.findUnique({
        where: {
          tenantId_deviceUuid: { tenantId, deviceUuid: dto.deviceUuid },
        },
      });
      if (existing && existing.employeeId !== employee.id) {
        throw new ConflictException({
          code: 'DEVICE_ALREADY_REGISTERED',
          message: 'This device is already registered to another employee',
        });
      }
      if (existing?.status === DeviceStatus.BLOCKED) {
        throw new ConflictException({
          code: 'DEVICE_BLOCKED',
          message: 'This device is blocked. Contact HR for assistance',
        });
      }

      const device = existing
        ? await tx.registeredDevice.update({
            where: { id: existing.id },
            data: {
              platform: dto.platform,
              deviceModel: dto.deviceModel,
              osVersion: dto.osVersion,
              appVersion: dto.appVersion,
              pushToken: dto.pushToken,
              lastIp: ipAddress,
              lastSeenAt: new Date(),
            },
          })
        : await tx.registeredDevice.create({
            data: {
              tenantId,
              employeeId: employee.id,
              deviceUuid: dto.deviceUuid,
              platform: dto.platform,
              deviceModel: dto.deviceModel,
              osVersion: dto.osVersion,
              appVersion: dto.appVersion,
              pushToken: dto.pushToken,
              lastIp: ipAddress,
              lastSeenAt: new Date(),
            },
          });

      if (!existing) {
        await Promise.all([
          this.audit.append(tx, {
            tenantId,
            action: 'attendance.device.registered',
            module: 'attendance',
            entityType: 'RegisteredDevice',
            entityId: device.id,
            newValue: this.publicDevice(device),
          }),
          this.outbox.append(tx, {
            tenantId,
            eventKey: 'attendance.device.registered',
            payload: {
              deviceId: device.id,
              employeeId: employee.id,
              status: device.status,
            },
          }),
        ]);
      }
      return { data: this.publicDevice(device) };
    });
  }

  mine(deviceUuid?: string) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employeeForCurrentUser(tx);
      const devices = await tx.registeredDevice.findMany({
        where: {
          employeeId: employee.id,
          ...(deviceUuid ? { deviceUuid } : {}),
        },
        orderBy: [{ isPrimary: 'desc' }, { registeredAt: 'desc' }],
      });
      return { data: devices.map((device) => this.publicDevice(device)) };
    });
  }

  removeMine(boundDeviceId?: string) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employeeForCurrentUser(tx);
      const device = boundDeviceId
        ? await tx.registeredDevice.findFirst({
            where: { id: boundDeviceId, employeeId: employee.id },
          })
        : await tx.registeredDevice.findFirst({
            where: {
              employeeId: employee.id,
              status: {
                in: [DeviceStatus.ACTIVE, DeviceStatus.PENDING_APPROVAL],
              },
            },
            orderBy: [{ isPrimary: 'desc' }, { lastSeenAt: 'desc' }],
          });
      if (!device) throw new NotFoundException('Current device not found');
      const updated = await tx.registeredDevice.update({
        where: { id: device.id },
        data: {
          status: DeviceStatus.BLOCKED,
          isPrimary: false,
          blockedBy: this.requireUserId(),
          blockedReason: 'Self-service device removal',
          pushToken: null,
        },
      });
      await this.revokeDeviceSessions(tx, device.id);
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: 'attendance.device.self_removed',
          module: 'attendance',
          entityType: 'RegisteredDevice',
          entityId: device.id,
          oldValue: this.publicDevice(device),
          newValue: this.publicDevice(updated),
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.device.self_removed',
          payload: { deviceId: device.id, employeeId: employee.id },
        }),
      ]);
      return { success: true };
    });
  }

  list(query: ListDevicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    return this.prisma.forTenant(async (tx) => {
      const scope = await this.employeeScope(tx);
      const where: Prisma.RegisteredDeviceWhereInput = {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(scope ? { employeeId: { in: scope } } : {}),
      };
      const [devices, total] = await Promise.all([
        tx.registeredDevice.findMany({
          where,
          include: {
            employee: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
          orderBy: { registeredAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.registeredDevice.count({ where }),
      ]);
      return {
        data: devices.map(({ employee, ...device }) => ({
          ...this.publicDevice(device),
          employee,
        })),
        meta: { page, limit, total },
      };
    });
  }

  approve(id: string, reason: string) {
    return this.decide(id, 'approved', reason, async (tx, device) => {
      if (device.status !== DeviceStatus.PENDING_APPROVAL) {
        throw this.invalidTransition(device.status, 'approve');
      }
      const hasPrimary = await tx.registeredDevice.findFirst({
        where: {
          employeeId: device.employeeId,
          status: DeviceStatus.ACTIVE,
          isPrimary: true,
        },
        select: { id: true },
      });
      return tx.registeredDevice.update({
        where: { id },
        data: {
          status: DeviceStatus.ACTIVE,
          isPrimary: !hasPrimary,
          approvedBy: this.requireUserId(),
          blockedBy: null,
          blockedReason: null,
        },
      });
    });
  }

  block(id: string, reason: string) {
    return this.decide(id, 'blocked', reason, async (tx, device) => {
      if (
        device.status === DeviceStatus.BLOCKED ||
        device.status === DeviceStatus.REPLACED
      ) {
        throw this.invalidTransition(device.status, 'block');
      }
      const updated = await tx.registeredDevice.update({
        where: { id },
        data: {
          status: DeviceStatus.BLOCKED,
          isPrimary: false,
          blockedBy: this.requireUserId(),
          blockedReason: reason,
        },
      });
      await this.revokeDeviceSessions(tx, id);
      return updated;
    });
  }

  replace(id: string, newDeviceId: string, reason: string) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const [oldDevice, newDevice] = await Promise.all([
        tx.registeredDevice.findUnique({ where: { id } }),
        tx.registeredDevice.findUnique({ where: { id: newDeviceId } }),
      ]);
      if (!oldDevice || !newDevice)
        throw new NotFoundException('Device not found');
      if (oldDevice.employeeId !== newDevice.employeeId) {
        throw new ConflictException({
          code: 'DEVICE_NOT_OWNED',
          message: 'Replacement devices must belong to the same employee',
        });
      }
      if (
        oldDevice.status !== DeviceStatus.ACTIVE ||
        newDevice.status !== DeviceStatus.PENDING_APPROVAL
      ) {
        throw new ConflictException({
          code: 'DEVICE_REPLACEMENT_INVALID',
          message: 'Only an active device can be replaced by a pending device',
        });
      }
      const [replaced, activated] = await Promise.all([
        tx.registeredDevice.update({
          where: { id },
          data: {
            status: DeviceStatus.REPLACED,
            isPrimary: false,
            replacedByDeviceId: newDeviceId,
          },
        }),
        tx.registeredDevice.update({
          where: { id: newDeviceId },
          data: {
            status: DeviceStatus.ACTIVE,
            isPrimary: true,
            approvedBy: this.requireUserId(),
          },
        }),
      ]);
      await this.revokeDeviceSessions(tx, id);
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: 'attendance.device.replaced',
          module: 'attendance',
          entityType: 'RegisteredDevice',
          entityId: id,
          oldValue: this.publicDevice(oldDevice),
          newValue: { replacement: this.publicDevice(activated), reason },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.device.replaced',
          payload: {
            oldDeviceId: replaced.id,
            newDeviceId: activated.id,
            employeeId: activated.employeeId,
          },
        }),
      ]);
      return { data: this.publicDevice(activated) };
    });
  }

  private decide(
    id: string,
    action: string,
    reason: string,
    mutation: (
      tx: PrismaTransaction,
      device: Prisma.RegisteredDeviceGetPayload<Record<string, never>>,
    ) => Promise<Prisma.RegisteredDeviceGetPayload<Record<string, never>>>,
  ) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const device = await tx.registeredDevice.findUnique({ where: { id } });
      if (!device) throw new NotFoundException('Device not found');
      const updated = await mutation(tx, device);
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: `attendance.device.${action}`,
          module: 'attendance',
          entityType: 'RegisteredDevice',
          entityId: id,
          oldValue: this.publicDevice(device),
          newValue: { ...this.publicDevice(updated), reason },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: `attendance.device.${action}`,
          payload: {
            deviceId: id,
            employeeId: updated.employeeId,
            status: updated.status,
          },
        }),
      ]);
      return { data: this.publicDevice(updated) };
    });
  }

  private async employeeForCurrentUser(tx: PrismaTransaction) {
    const employee = await tx.employee.findUnique({
      where: { userId: this.requireUserId() },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException({
        code: 'EMPLOYEE_PROFILE_NOT_FOUND',
        message: 'No employee profile is linked to this account',
      });
    }
    return employee;
  }

  private async employeeScope(tx: PrismaTransaction) {
    const userId = this.requireUserId();
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } }, employee: true },
    });
    if (!user) return [];
    const roles = new Set(user.roles.map(({ role }) => role.name));
    if (roles.has('BUSINESS_ADMIN') || roles.has('HR_ADMIN')) return null;
    if (!user.employee) return [];
    const reports = await tx.employee.findMany({
      where: { managerId: user.employee.id },
      select: { id: true },
    });
    return [user.employee.id, ...reports.map(({ id }) => id)];
  }

  private revokeDeviceSessions(tx: PrismaTransaction, deviceId: string) {
    return tx.refreshToken.updateMany({
      where: { deviceId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: RevokeReason.ADMIN },
    });
  }

  private invalidTransition(status: DeviceStatus, action: string) {
    return new ConflictException({
      code: 'DEVICE_STATE_INVALID',
      message: `A ${status.toLowerCase()} device cannot be ${action}d`,
    });
  }

  private publicDevice(device: {
    id: string;
    employeeId: string;
    deviceUuid: string;
    platform: string;
    deviceModel: string | null;
    osVersion: string | null;
    appVersion: string | null;
    status: DeviceStatus;
    isPrimary: boolean;
    replacedByDeviceId: string | null;
    registeredAt: Date;
    lastSeenAt: Date | null;
  }) {
    return {
      id: device.id,
      employeeId: device.employeeId,
      deviceUuid: device.deviceUuid,
      platform: device.platform,
      deviceModel: device.deviceModel,
      osVersion: device.osVersion,
      appVersion: device.appVersion,
      status: device.status,
      isPrimary: device.isPrimary,
      replacedByDeviceId: device.replacedByDeviceId,
      registeredAt: device.registeredAt,
      lastSeenAt: device.lastSeenAt,
    };
  }

  private requireTenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private requireUserId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }
}
