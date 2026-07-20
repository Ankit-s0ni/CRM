import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  NotificationPreferencesDto,
  NotificationQueryDto,
} from './dto/notification.dto';

const MANDATORY_EVENTS = new Set([
  'security.violation',
  'regularization.approved',
  'regularization.rejected',
  'leave.approved',
  'leave.rejected',
]);

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  list(query: NotificationQueryDto) {
    return this.prisma.forTenant(async (tx) => {
      const where: Prisma.NotificationWhereInput = {
        userId: this.userId(),
        isRead: query.unreadOnly ? false : undefined,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      };
      const [data, total] = await Promise.all([
        tx.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.notification.count({ where }),
      ]);
      return {
        data,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  unreadCount() {
    return this.prisma.forTenant(async (tx) => ({
      count: await tx.notification.count({
        where: {
          userId: this.userId(),
          isRead: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    }));
  }

  markRead(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const result = await tx.notification.updateMany({
        where: { id, userId: this.userId() },
        data: { isRead: true, readAt: new Date() },
      });
      if (!result.count) this.notFound();
      return { success: true };
    });
  }

  markAllRead() {
    return this.prisma.forTenant(async (tx) => {
      const result = await tx.notification.updateMany({
        where: { userId: this.userId(), isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true, updated: result.count };
    });
  }

  preferences() {
    return this.prisma.forTenant((tx) => this.preferencesInTransaction(tx));
  }

  updatePreferences(dto: NotificationPreferencesDto) {
    return this.prisma.forTenant(async (tx) => {
      for (const preference of dto.preferences) {
        const enabled = MANDATORY_EVENTS.has(preference.eventKey)
          ? true
          : preference.enabled;
        await tx.notificationPreference.upsert({
          where: {
            tenantId_userId_eventKey_channel: {
              tenantId: this.tenantId(),
              userId: this.userId(),
              eventKey: preference.eventKey,
              channel: preference.channel,
            },
          },
          create: {
            tenantId: this.tenantId(),
            userId: this.userId(),
            eventKey: preference.eventKey,
            channel: preference.channel,
            enabled,
          },
          update: { enabled },
        });
      }
      return this.preferencesInTransaction(tx);
    });
  }

  private async preferencesInTransaction(tx: PrismaTransaction) {
    const [templates, preferences] = await Promise.all([
      tx.notificationTemplate.findMany({
        where: { isActive: true, locale: 'en' },
        select: { eventKey: true, channel: true, subject: true },
        orderBy: [{ eventKey: 'asc' }, { channel: 'asc' }],
      }),
      tx.notificationPreference.findMany({
        where: { userId: this.userId() },
        orderBy: [{ eventKey: 'asc' }, { channel: 'asc' }],
      }),
    ]);
    const selected = new Map(
      preferences.map((preference) => [
        `${preference.eventKey}:${preference.channel}`,
        preference,
      ]),
    );
    return {
      data: templates.map((template) => {
        const preference = selected.get(
          `${template.eventKey}:${template.channel}`,
        );
        return {
          eventKey: template.eventKey,
          channel: template.channel,
          label: template.subject ?? humanizeEvent(template.eventKey),
          enabled:
            MANDATORY_EVENTS.has(template.eventKey) ||
            preference?.enabled !== false,
          mandatory: MANDATORY_EVENTS.has(template.eventKey),
        };
      }),
      mandatoryEventKeys: [...MANDATORY_EVENTS],
    };
  }

  private tenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private userId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification was not found',
    });
  }
}

function humanizeEvent(value: string) {
  return value
    .split('.')
    .at(-1)!
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}
