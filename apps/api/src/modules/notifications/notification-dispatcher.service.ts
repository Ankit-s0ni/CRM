import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AlertSeverity,
  DeliveryChannel,
  DeliveryStatus,
  NotifChannel,
  Prisma,
} from '@prisma/client';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../shared/tenancy/tenant-job-context.runner';
import {
  EMAIL_NOTIFICATION_PORT,
  type EmailNotificationPort,
  PUSH_NOTIFICATION_PORT,
  type PushNotificationPort,
} from './notification-provider.port';
import { NotificationRendererService } from './notification-renderer.service';

export type NotificationEventTask = {
  eventId: string;
  tenantId: string;
  eventKey: string;
  payload: Prisma.JsonValue;
};

const MANDATORY_EVENTS = new Set([
  'security.violation',
  'regularization.approved',
  'regularization.rejected',
  'leave.approved',
  'leave.rejected',
]);

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: TenantJobContextRunner,
    private readonly renderer: NotificationRendererService,
    @Inject(PUSH_NOTIFICATION_PORT)
    private readonly push: PushNotificationPort,
    @Inject(EMAIL_NOTIFICATION_PORT)
    private readonly email: EmailNotificationPort,
  ) {}

  process(task: NotificationEventTask) {
    return this.runner.run(task, () =>
      this.prisma.forTenant(async (tx) => {
        const payload = jsonObject(task.payload);
        const recipients = await this.recipients(tx, task.eventKey, payload);
        for (const recipient of recipients) {
          await this.notify(tx, task, payload, recipient);
        }
        return { recipients: recipients.length };
      }),
    );
  }

  private async notify(
    tx: PrismaTransaction,
    task: NotificationEventTask,
    payload: Record<string, Prisma.JsonValue>,
    recipient: Recipient,
  ) {
    const variables = { ...payload, employeeName: recipient.employeeName };
    const templates = await this.templates(tx, task.eventKey, recipient.locale);
    const inApp = templates.get(NotifChannel.IN_APP);
    if (!inApp) return;
    const rendered = this.renderer.render(inApp, variables);
    const dedupeKey = `${task.eventId}:${task.eventKey}`;
    const notification = await tx.notification.upsert({
      where: {
        tenantId_userId_dedupeKey: {
          tenantId: task.tenantId,
          userId: recipient.userId,
          dedupeKey,
        },
      },
      create: {
        tenantId: task.tenantId,
        userId: recipient.userId,
        eventKey: task.eventKey,
        dedupeKey,
        severity: severity(task.eventKey),
        title: rendered.subject ?? humanize(task.eventKey),
        body: rendered.body,
        module: moduleName(task.eventKey),
        referenceType: referenceType(task.eventKey),
        referenceId: uuidValue(payload.referenceId) ?? referenceId(payload),
        actionUrl: deepLink(task.eventKey, payload),
        data: payload,
        expiresAt: new Date(Date.now() + 90 * 86_400_000),
      },
      update: {},
    });
    const preferences = await tx.notificationPreference.findMany({
      where: { userId: recipient.userId, eventKey: task.eventKey },
    });
    const enabled = (channel: NotifChannel) =>
      MANDATORY_EVENTS.has(task.eventKey) ||
      preferences.find((item) => item.channel === channel)?.enabled !== false;

    if (templates.has(NotifChannel.PUSH) && enabled(NotifChannel.PUSH)) {
      const devices = await tx.registeredDevice.findMany({
        where: {
          employeeId: recipient.employeeId,
          status: 'ACTIVE',
          pushToken: { not: null },
        },
        select: { id: true, pushToken: true },
      });
      for (const device of devices) {
        if (!device.pushToken) continue;
        await this.deliverPush(
          tx,
          notification.id,
          device.id,
          device.pushToken,
          templates.get(NotifChannel.PUSH)!,
          variables,
        );
      }
    }
    if (templates.has(NotifChannel.EMAIL) && enabled(NotifChannel.EMAIL)) {
      await this.deliverEmail(
        tx,
        notification.id,
        recipient.email,
        templates.get(NotifChannel.EMAIL)!,
        variables,
      );
    }
  }

  private async deliverPush(
    tx: PrismaTransaction,
    notificationId: string,
    deviceId: string,
    token: string,
    template: Template,
    variables: Record<string, unknown>,
  ) {
    if (
      await this.delivered(tx, notificationId, DeliveryChannel.PUSH, deviceId)
    )
      return;
    const attemptNumber = await this.nextAttempt(
      tx,
      notificationId,
      DeliveryChannel.PUSH,
      deviceId,
    );
    const rendered = this.renderer.render(template, variables);
    try {
      const result = await this.push.send({
        token,
        title: rendered.subject ?? 'DeltCRM',
        body: rendered.body,
        data: { notificationId },
      });
      await tx.notificationDelivery.create({
        data: {
          notificationId,
          channel: DeliveryChannel.PUSH,
          deviceId,
          attemptNumber,
          retryCount: attemptNumber - 1,
          status: DeliveryStatus.DELIVERED,
          providerRef: result.providerRef,
          providerCode: result.providerCode,
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      const failure = providerFailure(error);
      await tx.notificationDelivery.create({
        data: {
          notificationId,
          channel: DeliveryChannel.PUSH,
          deviceId,
          attemptNumber,
          retryCount: attemptNumber - 1,
          status: DeliveryStatus.FAILED,
          providerCode: failure.code,
          errorMessage: failure.message,
          nextAttemptAt: failure.terminal
            ? null
            : new Date(Date.now() + backoff(attemptNumber)),
        },
      });
      if (failure.terminal) {
        await tx.registeredDevice.updateMany({
          where: { id: deviceId },
          data: { pushToken: null },
        });
        return;
      }
      throw error;
    }
  }

  private async deliverEmail(
    tx: PrismaTransaction,
    notificationId: string,
    email: string,
    template: Template,
    variables: Record<string, unknown>,
  ) {
    if (await this.delivered(tx, notificationId, DeliveryChannel.EMAIL, null))
      return;
    const attemptNumber = await this.nextAttempt(
      tx,
      notificationId,
      DeliveryChannel.EMAIL,
      null,
    );
    const rendered = this.renderer.render(template, variables);
    try {
      const result = await this.email.send({
        email,
        subject: rendered.subject ?? 'DeltCRM notification',
        body: rendered.body,
      });
      await tx.notificationDelivery.create({
        data: {
          notificationId,
          channel: DeliveryChannel.EMAIL,
          attemptNumber,
          retryCount: attemptNumber - 1,
          status: DeliveryStatus.DELIVERED,
          providerRef: result.providerRef,
          providerCode: result.providerCode,
          deliveredAt: new Date(),
        },
      });
    } catch (error) {
      const failure = providerFailure(error);
      await tx.notificationDelivery.create({
        data: {
          notificationId,
          channel: DeliveryChannel.EMAIL,
          attemptNumber,
          retryCount: attemptNumber - 1,
          status: failure.terminal
            ? DeliveryStatus.BOUNCED
            : DeliveryStatus.FAILED,
          providerCode: failure.code,
          errorMessage: failure.message,
          nextAttemptAt: failure.terminal
            ? null
            : new Date(Date.now() + backoff(attemptNumber)),
        },
      });
      if (!failure.terminal) throw error;
    }
  }

  private async templates(
    tx: PrismaTransaction,
    eventKey: string,
    locale: string,
  ) {
    const rows = await tx.notificationTemplate.findMany({
      where: { eventKey, isActive: true, locale: { in: [locale, 'en'] } },
      orderBy: { locale: 'desc' },
    });
    const templates = new Map<NotifChannel, Template>();
    for (const row of rows) {
      if (!templates.has(row.channel) || row.locale === locale) {
        templates.set(row.channel, row);
      }
    }
    return templates;
  }

  private async recipients(
    tx: PrismaTransaction,
    eventKey: string,
    payload: Record<string, Prisma.JsonValue>,
  ): Promise<Recipient[]> {
    const employeeId = stringValue(payload.employeeId);
    if (!employeeId) return [];
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, manager: { include: { user: true } } },
    });
    if (!employee) return [];
    const settings = await tx.tenantSettings.findUniqueOrThrow({
      where: { tenantId: employee.tenantId },
    });
    const own = employee.user
      ? [
          {
            userId: employee.user.id,
            employeeId: employee.id,
            email: employee.user.email,
            employeeName: employee.fullName,
            locale: settings.locale,
          },
        ]
      : [];
    if (!eventKey.endsWith('.submitted')) return own;
    const manager = employee.manager?.user
      ? [
          {
            userId: employee.manager.user.id,
            employeeId: employee.manager.id,
            email: employee.manager.user.email,
            employeeName: employee.fullName,
            locale: settings.locale,
          },
        ]
      : [];
    return manager.length ? manager : own;
  }

  private delivered(
    tx: PrismaTransaction,
    notificationId: string,
    channel: DeliveryChannel,
    deviceId: string | null,
  ) {
    return tx.notificationDelivery
      .count({
        where: {
          notificationId,
          channel,
          deviceId,
          status: DeliveryStatus.DELIVERED,
        },
      })
      .then((count) => count > 0);
  }

  private nextAttempt(
    tx: PrismaTransaction,
    notificationId: string,
    channel: DeliveryChannel,
    deviceId: string | null,
  ) {
    return tx.notificationDelivery
      .count({ where: { notificationId, channel, deviceId } })
      .then((count) => count + 1);
  }
}

type Template = {
  subject: string | null;
  bodyTemplate: string;
  requiredVariables: Prisma.JsonValue;
};

type Recipient = {
  userId: string;
  employeeId: string;
  email: string;
  employeeName: string;
  locale: string;
};

function jsonObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, Prisma.JsonValue] => entry[1] !== undefined,
    ),
  );
}

function stringValue(value: Prisma.JsonValue | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function uuidValue(value: Prisma.JsonValue | undefined) {
  const text = stringValue(value);
  return text && /^[0-9a-f-]{36}$/i.test(text) ? text : undefined;
}

function referenceId(payload: Record<string, Prisma.JsonValue>) {
  return (
    uuidValue(payload.regularizationRequestId) ??
    uuidValue(payload.leaveRequestId) ??
    uuidValue(payload.attendanceLogId)
  );
}

function referenceType(eventKey: string) {
  if (eventKey.startsWith('regularization.')) return 'RegularizationRequest';
  if (eventKey.startsWith('leave.')) return 'LeaveRequest';
  if (eventKey.startsWith('attendance.')) return 'AttendanceLog';
  return null;
}

function moduleName(eventKey: string) {
  return eventKey.split('.')[0] ?? null;
}

function deepLink(eventKey: string, payload: Record<string, Prisma.JsonValue>) {
  if (eventKey.startsWith('regularization.')) {
    return `/requests/${stringValue(payload.regularizationRequestId) ?? ''}`;
  }
  if (eventKey.startsWith('leave.')) {
    return `/leave/requests/${stringValue(payload.leaveRequestId) ?? ''}`;
  }
  return '/notifications';
}

function severity(eventKey: string) {
  if (eventKey.startsWith('security.')) return AlertSeverity.CRITICAL;
  if (eventKey.includes('rejected') || eventKey.includes('missed')) {
    return AlertSeverity.WARNING;
  }
  return AlertSeverity.INFO;
}

function humanize(eventKey: string) {
  return eventKey
    .split('.')
    .map((part) => part.replaceAll('_', ' '))
    .join(' · ');
}

function providerFailure(error: unknown) {
  const value = error as {
    message?: string;
    providerCode?: string;
    terminal?: boolean;
  };
  return {
    message: (value.message ?? 'Provider delivery failed').slice(0, 1000),
    code: value.providerCode,
    terminal: value.terminal === true,
  };
}

function backoff(attempt: number) {
  return Math.min(300_000, 2 ** Math.min(attempt, 8) * 1000);
}
