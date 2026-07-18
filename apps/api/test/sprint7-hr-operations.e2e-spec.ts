import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import { LeaveApprovedProcessor } from '../src/modules/leave/leave-approved.processor';
import { NotificationDispatcherService } from '../src/modules/notifications/notification-dispatcher.service';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';

type Session = { accessToken: string; userId: string; tenantId: string };
type Data<T> = { data: T };

describe('Sprint 7 HR operations loop (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let auth: AuthService;
  let notifications: NotificationDispatcherService;
  let leaveEvents: LeaveApprovedProcessor;
  let admin: Session;
  let employee: Session;
  let outsideManager: Session;
  let tenantId = '';
  let employeeId = '';
  let attendanceLogId = '';
  let regularizationId = '';
  let leaveRequestId = '';
  let rejectedLeaveRequestId = '';
  const reportIds: string[] = [];
  let payrollLockId = '';
  let notificationDeviceId = '';
  let syncDeviceId = '';
  let syncClientEventUuid = '';
  let outsideManagerEmployeeId = '';
  let outsideManagerUserId = '';
  let originalBalance = 0;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.REPORT_QUEUE_MODE = 'inline';
    process.env.ATTENDANCE_QUEUE_MODE = 'disabled';
    const fixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication<INestApplication<App>>();
    await app.init();
    auth = fixture.get(AuthService);
    notifications = fixture.get(NotificationDispatcherService);
    leaveEvents = fixture.get(LeaveApprovedProcessor);
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { subdomain: 'acme' },
    });
    tenantId = tenant.id;
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { tenantId_email: { tenantId, email: 'admin@acme.com' } },
    });
    const employeeUser = await prisma.user.findUniqueOrThrow({
      where: { tenantId_email: { tenantId, email: 'employee@acme.com' } },
    });
    employeeId = (
      await prisma.employee.findUniqueOrThrow({
        where: { userId: employeeUser.id },
      })
    ).id;
    const managerRole = await prisma.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId, name: 'MANAGER' } },
    });
    const managerEmployee = await prisma.employee.findFirstOrThrow({
      where: { tenantId, id: { not: employeeId }, userId: null },
      orderBy: { employeeCode: 'asc' },
    });
    const managerUser = await prisma.user.create({
      data: {
        tenantId,
        email: `sprint7-manager-${randomUUID()}@acme.test`,
        passwordHash: await argon2.hash('Manager123!'),
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });
    outsideManagerUserId = managerUser.id;
    outsideManagerEmployeeId = managerEmployee.id;
    await prisma.userRole.create({
      data: { userId: managerUser.id, roleId: managerRole.id },
    });
    await prisma.employee.update({
      where: { id: managerEmployee.id },
      data: { userId: managerUser.id, managerId: null },
    });
    admin = await login(adminUser.email, 'TenantAdmin123!');
    employee = await login(employeeUser.email, 'Employee123!');
    outsideManager = await login(managerUser.email, 'Manager123!');
    const policy = await prisma.leavePolicy.findFirstOrThrow({
      where: { tenantId, name: 'Annual Leave' },
    });
    const balance = await prisma.leaveBalance.findUniqueOrThrow({
      where: {
        tenantId_employeeId_policyId: {
          tenantId,
          employeeId,
          policyId: policy.id,
        },
      },
    });
    originalBalance = Number(balance.remainingDays);
    const log = await prisma.attendanceLog.upsert({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId,
          employeeId,
          attendanceDate: new Date('2026-07-17T00:00:00.000Z'),
        },
      },
      update: {
        firstCheckin: new Date('2026-07-17T09:30:00.000Z'),
        lastCheckout: new Date('2026-07-17T18:00:00.000Z'),
        attendanceStatus: 'PRESENT',
        finalizedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        payrollLockId: null,
      },
      create: {
        tenantId,
        employeeId,
        attendanceDate: new Date('2026-07-17T00:00:00.000Z'),
        firstCheckin: new Date('2026-07-17T09:30:00.000Z'),
        lastCheckout: new Date('2026-07-17T18:00:00.000Z'),
        attendanceStatus: 'PRESENT',
        finalizedAt: new Date(),
      },
    });
    attendanceLogId = log.id;
  });

  afterAll(async () => {
    if (payrollLockId) {
      await prisma.attendanceLog.updateMany({
        where: { payrollLockId },
        data: { lockedAt: null, lockedBy: null, payrollLockId: null },
      });
      await prisma.payrollLockHistory.deleteMany({ where: { payrollLockId } });
      await prisma.payrollLockPeriod.deleteMany({
        where: { id: payrollLockId },
      });
    }
    await prisma.attendanceEvent.deleteMany({
      where: { regularizationRequestId: regularizationId || undefined },
    });
    if (regularizationId)
      await prisma.regularizationRequest.deleteMany({
        where: { id: regularizationId },
      });
    await prisma.attendanceException.deleteMany({
      where: { leaveRequestId: leaveRequestId || undefined },
    });
    if (leaveRequestId) {
      await prisma.leaveBalanceLedger.deleteMany({ where: { leaveRequestId } });
      await prisma.leaveRequest.deleteMany({ where: { id: leaveRequestId } });
    }
    if (rejectedLeaveRequestId) {
      await prisma.leaveBalanceLedger.deleteMany({
        where: { leaveRequestId: rejectedLeaveRequestId },
      });
      await prisma.leaveRequest.deleteMany({
        where: { id: rejectedLeaveRequestId },
      });
    }
    const policy = await prisma.leavePolicy.findFirst({
      where: { tenantId, name: 'Annual Leave' },
    });
    if (policy) {
      await prisma.leaveBalance.updateMany({
        where: { tenantId, employeeId, policyId: policy.id },
        data: { remainingDays: originalBalance },
      });
    }
    if (reportIds.length)
      await prisma.reportExport.deleteMany({
        where: { id: { in: reportIds } },
      });
    if (notificationDeviceId)
      await prisma.registeredDevice.deleteMany({
        where: { id: notificationDeviceId },
      });
    if (syncClientEventUuid)
      await prisma.attendanceSyncReceipt.deleteMany({
        where: { tenantId, clientEventUuid: syncClientEventUuid },
      });
    if (syncDeviceId)
      await prisma.registeredDevice.deleteMany({ where: { id: syncDeviceId } });
    await prisma.notificationDelivery.deleteMany({
      where: { notification: { tenantId, userId: employee.userId } },
    });
    await prisma.notification.deleteMany({
      where: {
        tenantId,
        userId: employee.userId,
        eventKey: { in: ['regularization.approved', 'leave.approved'] },
      },
    });
    await prisma.notificationPreference.deleteMany({
      where: {
        tenantId,
        userId: employee.userId,
        eventKey: 'regularization.approved',
      },
    });
    await prisma.outboxEvent.deleteMany({
      where: {
        tenantId,
        eventKey: {
          in: [
            'regularization.submitted',
            'regularization.approved',
            'leave.submitted',
            'leave.approved',
            'payroll.locked',
            'payroll.reopened',
          ],
        },
      },
    });
    await prisma.tenantAuditLog.deleteMany({
      where: {
        tenantId,
        module: { in: ['regularization', 'leave', 'payroll'] },
        createdAt: { gte: new Date(Date.now() - 60 * 60_000) },
      },
    });
    if (outsideManagerEmployeeId) {
      await prisma.employee.update({
        where: { id: outsideManagerEmployeeId },
        data: { userId: null },
      });
    }
    if (outsideManagerUserId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: outsideManagerUserId },
      });
      await prisma.userRole.deleteMany({
        where: { userId: outsideManagerUserId },
      });
      await prisma.user.deleteMany({ where: { id: outsideManagerUserId } });
    }
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it('approves a correction, recomputes evidence, and deduplicates its notification', async () => {
    const created = await api(employee)
      .post('/regularizations')
      .send({
        attendanceLogId,
        requestedCheckin: '2026-07-17T09:00:00.000Z',
        requestedCheckout: '2026-07-17T18:05:00.000Z',
        reason: 'Office reader was unavailable during arrival',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    regularizationId = (created.body as Data<{ id: string }>).data.id;
    await api(outsideManager)
      .post(`/regularizations/${regularizationId}/approve`)
      .send({ comment: 'Attempt outside reporting chain' })
      .expect(403)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe(
          'REGULARIZATION_NOT_AUTHORIZED',
        ),
      );
    await api(admin)
      .post(`/regularizations/${regularizationId}/approve`)
      .send({ comment: 'Evidence checked against reception log' })
      .expect(201);
    expect(
      await prisma.attendanceEvent.count({
        where: { regularizationRequestId: regularizationId },
      }),
    ).toBe(2);
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        tenantId,
        eventKey: 'regularization.approved',
        payload: {
          path: ['regularizationRequestId'],
          equals: regularizationId,
        },
      },
    });
    const task = {
      eventId: event.id,
      tenantId,
      eventKey: event.eventKey,
      payload: event.payload,
    };
    const device = await prisma.registeredDevice.upsert({
      where: {
        tenantId_deviceUuid: {
          tenantId,
          deviceUuid: 'sprint7-terminal-push-device',
        },
      },
      update: {
        employeeId,
        status: 'ACTIVE',
        pushToken: 'terminal-push-token',
      },
      create: {
        tenantId,
        employeeId,
        deviceUuid: 'sprint7-terminal-push-device',
        platform: 'ANDROID',
        status: 'ACTIVE',
        pushToken: 'terminal-push-token',
      },
    });
    notificationDeviceId = device.id;
    const originalFetch = global.fetch;
    process.env.FCM_GATEWAY_URL = 'https://fcm-gateway.test/send';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: () => Promise.resolve({ code: 'UNREGISTERED' }),
    });
    try {
      await notifications.process(task);
      await notifications.process(task);
    } finally {
      global.fetch = originalFetch;
      delete process.env.FCM_GATEWAY_URL;
    }
    expect(
      (
        await prisma.registeredDevice.findUniqueOrThrow({
          where: { id: device.id },
        })
      ).pushToken,
    ).toBeNull();
    expect(
      await prisma.notificationDelivery.count({
        where: {
          deviceId: device.id,
          providerCode: 'UNREGISTERED',
          status: 'FAILED',
        },
      }),
    ).toBe(1);
    const inbox = await api(employee)
      .get('/notifications?page=1&limit=20')
      .expect(200);
    expect(
      (inbox.body as Data<Array<{ eventKey: string }>>).data.filter(
        (item) => item.eventKey === 'regularization.approved',
      ),
    ).toHaveLength(1);
    const preferences = await api(employee)
      .put('/notification-preferences')
      .send({
        preferences: [
          {
            eventKey: 'regularization.approved',
            channel: 'PUSH',
            enabled: false,
          },
        ],
      })
      .expect(200);
    expect(
      (preferences.body as Data<Array<{ enabled: boolean }>>).data[0].enabled,
    ).toBe(true);
  });

  it('reserves leave, approves it through an event subscriber, and recomputes attendance once', async () => {
    const policy = await prisma.leavePolicy.findFirstOrThrow({
      where: { tenantId, name: 'Annual Leave' },
    });
    const response = await api(employee)
      .post('/leave-requests')
      .send({
        policyId: policy.id,
        startDate: '2026-07-20',
        endDate: '2026-07-20',
        halfDayStart: true,
        reason: 'Medical appointment during the morning',
      })
      .expect(201);
    leaveRequestId = (response.body as Data<{ id: string; totalDays: number }>)
      .data.id;
    expect((response.body as Data<{ totalDays: number }>).data.totalDays).toBe(
      0.5,
    );
    await api(admin)
      .post(`/leave-requests/${leaveRequestId}/approve`)
      .send({ comment: 'Coverage confirmed with operations' })
      .expect(201);
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        tenantId,
        eventKey: 'leave.approved',
        payload: { path: ['leaveRequestId'], equals: leaveRequestId },
      },
    });
    const task = {
      eventId: event.id,
      tenantId,
      eventKey: event.eventKey,
      payload: event.payload,
    };
    await leaveEvents.process(task);
    await leaveEvents.process(task);
    expect(
      await prisma.attendanceException.count({ where: { leaveRequestId } }),
    ).toBe(1);
    const log = await prisma.attendanceLog.findUniqueOrThrow({
      where: {
        tenantId_employeeId_attendanceDate: {
          tenantId,
          employeeId,
          attendanceDate: new Date('2026-07-20T00:00:00.000Z'),
        },
      },
    });
    expect(log.attendanceStatus).toBe('HALF_DAY');

    const balanceAfterApproval = await prisma.leaveBalance.findUniqueOrThrow({
      where: {
        tenantId_employeeId_policyId: {
          tenantId,
          employeeId,
          policyId: policy.id,
        },
      },
    });
    const rejected = await api(employee)
      .post('/leave-requests')
      .send({
        policyId: policy.id,
        startDate: '2026-07-23',
        endDate: '2026-07-23',
        reason: 'Rejected leave balance restoration test',
      })
      .expect(201);
    rejectedLeaveRequestId = (rejected.body as Data<{ id: string }>).data.id;
    await api(admin)
      .post(`/leave-requests/${rejectedLeaveRequestId}/reject`)
      .send({ comment: 'Coverage is unavailable for this date' })
      .expect(201);
    const restoredBalance = await prisma.leaveBalance.findUniqueOrThrow({
      where: {
        tenantId_employeeId_policyId: {
          tenantId,
          employeeId,
          policyId: policy.id,
        },
      },
    });
    expect(Number(restoredBalance.remainingDays)).toBe(
      Number(balanceAfterApproval.remainingDays),
    );
    expect(
      await prisma.attendanceException.count({
        where: { leaveRequestId: rejectedLeaveRequestId },
      }),
    ).toBe(0);
  });

  it('generates a reproducible payroll export, locks, rejects mutation, and audits reopen', async () => {
    await prisma.attendanceLog.updateMany({
      where: {
        tenantId,
        attendanceDate: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lte: new Date('2026-07-31T00:00:00.000Z'),
        },
      },
      data: { finalizedAt: new Date(), attendanceStatus: 'PRESENT' },
    });
    for (const endpoint of [
      'muster',
      'late-ot',
      'violations',
      'field-distance',
    ]) {
      const generated = await api(admin)
        .post(`/reports/${endpoint}`)
        .send({ period: '2026-07', format: 'CSV' })
        .expect(201);
      const data = (
        generated.body as Data<{ id: string; status: string; checksum: string }>
      ).data;
      reportIds.push(data.id);
      expect(data.status).toBe('COMPLETED');
      expect(data.checksum).toMatch(/^[a-f0-9]{64}$/);
    }
    const report = await api(admin)
      .post('/reports/payroll-export')
      .send({ period: '2026-07', format: 'CSV' })
      .expect(201);
    const reportData = (
      report.body as Data<{ id: string; status: string; checksum: string }>
    ).data;
    reportIds.push(reportData.id);
    expect(reportData.status).toBe('COMPLETED');
    expect(reportData.checksum).toMatch(/^[a-f0-9]{64}$/);
    await api(admin).get(`/reports/${reportData.id}/download`).expect(200);
    const locked = await api(admin)
      .post('/payroll-locks')
      .send({ period: '2026-07', exportId: reportData.id })
      .expect(201);
    payrollLockId = (locked.body as Data<{ id: string }>).data.id;
    const policy = await prisma.leavePolicy.findFirstOrThrow({
      where: { tenantId, name: 'Annual Leave' },
    });
    await api(employee)
      .post('/leave-requests')
      .send({
        policyId: policy.id,
        startDate: '2026-07-21',
        endDate: '2026-07-21',
        reason: 'Locked period mutation test',
      })
      .expect(423)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('ATTENDANCE_DAY_LOCKED'),
      );
    await api(employee)
      .post('/regularizations')
      .send({
        attendanceLogId,
        requestedCheckout: '2026-07-17T18:10:00.000Z',
        reason: 'Locked period correction attempt',
        idempotencyKey: randomUUID(),
      })
      .expect(423)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('ATTENDANCE_DAY_LOCKED'),
      );
    await api(admin)
      .post('/attendance-exceptions')
      .send({
        employeeId,
        exceptionType: 'WFH',
        startDate: '2026-07-22',
        endDate: '2026-07-22',
        reason: 'Locked period exception attempt',
      })
      .expect(423)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('ATTENDANCE_DAY_LOCKED'),
      );
    await api(employee)
      .post('/attendance/check-in')
      .send({ requestId: randomUUID() })
      .expect(423)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('ATTENDANCE_DAY_LOCKED'),
      );
    const adminEmployee = await prisma.employee.findUniqueOrThrow({
      where: { userId: admin.userId },
    });
    const office = await prisma.employeeOfficeAssignment.findFirstOrThrow({
      where: { employeeId: adminEmployee.id, isPrimary: true },
      include: { office: true },
    });
    const deviceUuid = randomUUID();
    const syncDevice = await prisma.registeredDevice.create({
      data: {
        tenantId,
        employeeId: adminEmployee.id,
        deviceUuid,
        platform: 'ANDROID',
        status: 'ACTIVE',
      },
    });
    syncDeviceId = syncDevice.id;
    syncClientEventUuid = randomUUID();
    const clientTime = new Date();
    const sync = await api(admin)
      .post('/attendance/sync')
      .send({
        items: [
          {
            clientEventUuid: syncClientEventUuid,
            type: 'CHECKIN',
            deviceUuid,
            attestationToken: 'genuine-sprint7-device-token',
            integrityIssuedAt: new Date(
              clientTime.getTime() - 30_000,
            ).toISOString(),
            integrityExpiresAt: new Date(
              clientTime.getTime() + 10 * 60_000,
            ).toISOString(),
            clientTime: clientTime.toISOString(),
            clientClockOffsetSeconds: 0,
            latitude: Number(office.office.latitude),
            longitude: Number(office.office.longitude),
            accuracyMeters: 10,
            mockLocation: false,
          },
        ],
      })
      .expect(201);
    expect(
      (sync.body as Data<Array<{ status: string; code: string }>>).data[0],
    ).toMatchObject({ status: 'REJECTED', code: 'ATTENDANCE_DAY_LOCKED' });
    await api(admin)
      .post(`/payroll-locks/${payrollLockId}/reopen`)
      .send({ reason: 'Payroll variance requires a documented correction' })
      .expect(201);
    const replacementExport = await api(admin)
      .post('/reports/payroll-export')
      .send({ period: '2026-07', format: 'CSV' })
      .expect(201);
    const replacementExportId = (replacementExport.body as Data<{ id: string }>)
      .data.id;
    reportIds.push(replacementExportId);
    await api(admin)
      .post('/payroll-locks')
      .send({ period: '2026-07', exportId: replacementExportId })
      .expect(201);
    const history = await prisma.payrollLockHistory.findMany({
      where: { payrollLockId },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.map((item) => item.action)).toEqual([
      'LOCKED',
      'REOPENED',
      'LOCKED',
    ]);
  });

  function api(session: Session) {
    const withAuth = (test: request.Test) =>
      test
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('x-tenant-id', session.tenantId);
    return {
      get: (path: string) => withAuth(request(app.getHttpServer()).get(path)),
      post: (path: string) => withAuth(request(app.getHttpServer()).post(path)),
      put: (path: string) => withAuth(request(app.getHttpServer()).put(path)),
    };
  }

  async function login(email: string, password: string): Promise<Session> {
    const result = await TenantContextService.run({ tenantId }, () =>
      auth.login(email, password, '127.0.0.1', 'sprint7-jest'),
    );
    return {
      tenantId,
      userId: result.user.id,
      accessToken: result.accessToken,
    };
  }
});
