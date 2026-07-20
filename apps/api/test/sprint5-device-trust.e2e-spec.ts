import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/identity/auth.service';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../src/shared/authorization/permissions.constants';
import { TenantContextService } from '../src/shared/tenancy/tenant-context.service';
import { TestDataFactory } from './support/factories';

type Session = {
  tenantId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
};
type DeviceBody = {
  data: { id: string; status: string; isPrimary: boolean };
};
type ListBody = { data: unknown[] };
type ErrorBody = { code: string };
type AlertBody = { data: { id: string; status: string } };
type ConsentBody = { data: { active: boolean } };
type PresignBody = { data: { objectKey: string } };
type EnrollmentBody = {
  data: {
    version: number;
    status: string;
    consentActive?: boolean;
    enrolled?: boolean;
    eligibleForFaceVerification?: boolean;
  };
};

function expectSafeFailure(body: unknown, code: string) {
  const response = body as Record<string, unknown>;
  expect(Object.keys(response).sort()).toEqual([
    'code',
    'details',
    'message',
    'path',
    'requestId',
    'statusCode',
    'timestamp',
  ]);
  expect(response.code).toBe(code);
  expect(typeof response.message).toBe('string');
  expect(response.details).not.toBeNull();
  expect(typeof response.details).toBe('object');
  const serialized = JSON.stringify(response);
  for (const forbidden of [
    'attestationToken',
    'integrityVerdict',
    'observedIp',
    'faceMatchScore',
    'selfieKey',
    'provider-secret',
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

describe('Sprint 5 device trust (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let pool: Pool;
  let factory: TestDataFactory;
  let auth: AuthService;
  let tenantId = '';
  let admin: Session;
  let employee: Session;
  let employeeId = '';
  const stamp = Date.now();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.IMPORT_QUEUE_MODE = 'inline';
    process.env.IMPORT_STORAGE_MODE = 'memory';
    process.env.ATTENDANCE_QUEUE_MODE = 'disabled';
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    auth = moduleFixture.get(AuthService);
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    factory = new TestDataFactory(prisma);
    await prisma.permission.createMany({
      data: Object.values(PERMISSIONS).map((key) => ({ key })),
      skipDuplicates: true,
    });

    const tenant = await factory.createTenant({
      companyName: `Sprint 5 Devices ${stamp}`,
      subdomain: `sprint5-devices-${stamp}`,
    });
    tenantId = tenant.id;
    await factory.ensureTrialSubscription(tenantId, 20);
    const attendanceModule = await prisma.module.findUniqueOrThrow({
      where: { key: 'ATTENDANCE' },
    });
    await prisma.tenantModule.create({
      data: {
        tenantId,
        moduleId: attendanceModule.id,
        isActive: true,
        activatedAt: new Date(),
      },
    });
    admin = await createSession('BUSINESS_ADMIN');
    employee = await createSession('EMPLOYEE');
    const department = await factory.createDepartment({
      tenantId,
      name: `Device Operations ${stamp}`,
    });
    employeeId = (
      await factory.createEmployee({
        tenantId,
        deptId: department.id,
        userId: employee.userId,
        employeeCode: `S5-DEVICE-${stamp}`,
        fullName: 'Maha Device Test',
      })
    ).id;
    await prisma.alertRule.createMany({
      data: [
        { tenantId, ruleType: 'GEOFENCE_VIOLATION', cooldownMinutes: 60 },
        { tenantId, ruleType: 'FACE_MISMATCH', cooldownMinutes: 60 },
        { tenantId, ruleType: 'MOCK_LOCATION', cooldownMinutes: 60 },
        { tenantId, ruleType: 'ROOTED_DEVICE', cooldownMinutes: 60 },
        { tenantId, ruleType: 'CLOCK_TAMPER', cooldownMinutes: 60 },
        { tenantId, ruleType: 'DEVICE_MISMATCH', cooldownMinutes: 60 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.attendanceEvent.deleteMany({ where: { tenantId } });
    await prisma.securityAlert.deleteMany({ where: { tenantId } });
    await prisma.alertRule.deleteMany({ where: { tenantId } });
    await prisma.attendanceVerificationLog.deleteMany({ where: { tenantId } });
    await prisma.attendanceLog.deleteMany({ where: { tenantId } });
    await prisma.registeredDevice.deleteMany({ where: { tenantId } });
    await prisma.faceEnrollment.deleteMany({ where: { tenantId } });
    await prisma.biometricConsent.deleteMany({ where: { tenantId } });
    await prisma.employeeOfficeAssignment.deleteMany({ where: { tenantId } });
    await prisma.officeLocation.deleteMany({ where: { tenantId } });
    await prisma.policyAssignment.deleteMany({ where: { tenantId } });
    await prisma.attendancePolicy.deleteMany({ where: { tenantId } });
    await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId } });
    await prisma.employee.deleteMany({ where: { tenantId } });
    await prisma.department.deleteMany({ where: { tenantId } });
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    const roles = await prisma.role.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const roleIds = roles.map(({ id }) => id);
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.loginAttempt.deleteMany({ where: { tenantId } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: roleIds } },
    });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.role.deleteMany({ where: { tenantId } });
    await prisma.tenantModule.deleteMany({ where: { tenantId } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.tenantSettings.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
    await prisma.$disconnect();
    await pool.end();
  });

  it('registers, approves and binds a refresh session to the device', async () => {
    const deviceUuid = randomUUID();
    const registered = await api(employee)
      .post('/devices/register')
      .send({
        deviceUuid,
        platform: 'ANDROID',
        deviceModel: 'Pixel 10',
        osVersion: '16',
        appVersion: '1.0.0',
        pushToken: 'must-not-be-returned',
      })
      .expect(201);
    const registeredBody = registered.body as DeviceBody;
    const deviceId = registeredBody.data.id;
    expect(registeredBody.data).not.toHaveProperty('pushToken');
    expect(registeredBody.data.status).toBe('PENDING_APPROVAL');

    await api(employee).get('/devices').expect(403);
    await api(admin)
      .get(`/devices?employeeId=${employeeId}`)
      .expect(200)
      .expect(({ body }) => expect((body as ListBody).data).toHaveLength(1));
    await api(admin)
      .post(`/devices/${deviceId}/approve`)
      .send({ reason: 'Employee identity verified by HR' })
      .expect(201)
      .expect(({ body }) =>
        expect((body as DeviceBody).data.isPrimary).toBe(true),
      );

    const bound = await TenantContextService.run({ tenantId }, () =>
      auth.login(
        employeeEmail(),
        'Sprint5User123!',
        '127.0.0.1',
        'sprint5-jest',
        deviceUuid,
      ),
    );
    const stored = await prisma.refreshToken.findFirstOrThrow({
      where: { userId: employee.userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(stored.deviceId).toBe(deviceId);
    expect(bound.user.device).toMatchObject({ id: deviceId, status: 'ACTIVE' });
  });

  it('replaces the primary device and revokes its bound refresh family', async () => {
    const oldDevice = await prisma.registeredDevice.findFirstOrThrow({
      where: { tenantId, employeeId, status: 'ACTIVE' },
    });
    const newUuid = randomUUID();
    const next = await api(employee)
      .post('/devices/register')
      .send({ deviceUuid: newUuid, platform: 'IOS', deviceModel: 'iPhone' })
      .expect(201);
    const newDeviceId = (next.body as DeviceBody).data.id;

    await api(admin)
      .post(`/devices/${oldDevice.id}/replace`)
      .send({
        newDeviceId,
        reason: 'Employee replaced a lost company phone',
      })
      .expect(201)
      .expect(({ body }) => {
        expect((body as DeviceBody).data).toMatchObject({
          id: newDeviceId,
          status: 'ACTIVE',
          isPrimary: true,
        });
      });

    expect(
      await prisma.refreshToken.count({
        where: {
          deviceId: oldDevice.id,
          revokedAt: { not: null },
          revokedReason: 'ADMIN',
        },
      }),
    ).toBeGreaterThan(0);
    expect(
      await prisma.registeredDevice.count({
        where: { tenantId, employeeId, status: 'ACTIVE', isPrimary: true },
      }),
    ).toBe(1);
  });

  it('records consent and completes one private liveness-backed enrollment', async () => {
    await api(employee)
      .post('/face-enrollments/presign')
      .send({
        filename: 'face.jpg',
        contentType: 'image/jpeg',
        fileSize: 100000,
      })
      .expect(403)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('CONSENT_MISSING'),
      );

    await api(employee)
      .post('/biometric-consents')
      .send({ policyVersion: '1.2', accepted: true })
      .expect(201)
      .expect(({ body }) =>
        expect((body as ConsentBody).data.active).toBe(true),
      );
    const presign = await api(employee)
      .post('/face-enrollments/presign')
      .send({
        filename: 'face.jpg',
        contentType: 'image/jpeg',
        fileSize: 100000,
      })
      .expect(201);
    const objectKey = (presign.body as PresignBody).data.objectKey;
    expect(objectKey).toContain(
      `private/${tenantId}/biometrics/${employeeId}/`,
    );

    await api(employee)
      .post('/face-enrollments')
      .send({
        privateObjectKey: objectKey,
        livenessProofToken: `test-live:${objectKey}`,
      })
      .expect(201)
      .expect(({ body }) => {
        const response = (body as EnrollmentBody).data;
        expect(response).toMatchObject({ version: 1, status: 'ACTIVE' });
        expect(response).not.toHaveProperty('privateObjectKey');
        expect(response).not.toHaveProperty('embeddingRef');
      });
    await api(employee)
      .get('/face-enrollments/me/status')
      .expect(200)
      .expect(({ body }) => {
        expect((body as EnrollmentBody).data).toMatchObject({
          consentActive: true,
          enrolled: true,
          eligibleForFaceVerification: true,
        });
      });
    await api(employee)
      .post('/face-enrollments')
      .send({
        privateObjectKey: objectKey,
        livenessProofToken: `test-live:${objectKey}`,
      })
      .expect(409)
      .expect(({ body }) =>
        expect((body as ErrorBody).code).toBe('FACE_PROFILE_LOCKED'),
      );

    await api(employee)
      .get(`/face-enrollments/${employeeId}/status`)
      .expect(403);
    await api(admin)
      .get(`/face-enrollments/${employeeId}/status`)
      .expect(200)
      .expect(({ body }) =>
        expect((body as EnrollmentBody).data).toMatchObject({
          consentActive: true,
          enrolled: true,
          eligibleForFaceVerification: true,
        }),
      );
    await api(admin)
      .post(`/face-enrollments/${employeeId}/reset`)
      .send({ reason: 'Employee identity was reverified by HR' })
      .expect(201)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          data: { enrolled: false },
          idempotent: false,
        }),
      );
    await api(admin)
      .post(`/face-enrollments/${employeeId}/reset`)
      .send({ reason: 'Employee identity was reverified by HR' })
      .expect(201)
      .expect(({ body }) =>
        expect((body as { idempotent: boolean }).idempotent).toBe(true),
      );
    await expect(
      prisma.tenantAuditLog.findFirstOrThrow({
        where: {
          tenantId,
          entityId: employeeId,
          action: 'attendance.face_enrollment.reset',
        },
        select: { actorUserId: true, newValue: true },
      }),
    ).resolves.toMatchObject({ actorUserId: admin.userId });
    await api(admin)
      .get(`/face-enrollments/${employeeId}/status`)
      .expect(200)
      .expect(({ body }) =>
        expect((body as EnrollmentBody).data).toMatchObject({
          consentActive: true,
          enrolled: false,
          eligibleForFaceVerification: false,
        }),
      );

    const secondPresign = await api(employee)
      .post('/face-enrollments/presign')
      .send({
        filename: 'face-reset.jpg',
        contentType: 'image/jpeg',
        fileSize: 100000,
      })
      .expect(201);
    const secondObjectKey = (secondPresign.body as PresignBody).data.objectKey;
    await api(employee)
      .post('/face-enrollments')
      .send({
        privateObjectKey: secondObjectKey,
        livenessProofToken: `test-live:${secondObjectKey}`,
      })
      .expect(201)
      .expect(({ body }) =>
        expect((body as EnrollmentBody).data.version).toBe(2),
      );

    await api(employee).delete('/biometric-consents/me').expect(200);
    const consentHistory = await prisma.biometricConsent.findMany({
      where: { tenantId, employeeId },
      orderBy: { consentedAt: 'asc' },
      select: { action: true },
    });
    expect(consentHistory).toEqual([
      { action: 'GRANTED' },
      { action: 'WITHDRAWN' },
    ]);
    await api(employee)
      .get('/face-enrollments/me/status')
      .expect(200)
      .expect(({ body }) => {
        expect((body as EnrollmentBody).data).toMatchObject({
          consentActive: false,
          enrolled: false,
          eligibleForFaceVerification: false,
        });
      });
    const revokedEnrollment = await prisma.faceEnrollment.findFirstOrThrow({
      where: { tenantId, employeeId },
      select: { status: true, revokedAt: true },
    });
    expect(revokedEnrollment.status).toBe('REVOKED');
    expect(revokedEnrollment.revokedAt).toBeInstanceOf(Date);
    await expect(
      prisma.employee.findUniqueOrThrow({
        where: { id: employeeId },
        select: { masterSelfie: true, faceEmbeddingRef: true },
      }),
    ).resolves.toEqual({ masterSelfie: null, faceEmbeddingRef: null });
  });

  it('persists failed verification without attendance and atomically appends a valid punch', async () => {
    const optOutPolicy = await prisma.attendancePolicy.create({
      data: {
        tenantId,
        name: `Biometric opt-out policy ${stamp}`,
        allowEarlyCheckout: true,
        requireFaceMatch: true,
        selfieMode: 'REQUIRED',
        allowBiometricOptOut: true,
      },
    });
    await prisma.policyAssignment.create({
      data: {
        tenantId,
        policyId: optOutPolicy.id,
        scope: 'TENANT_DEFAULT',
      },
    });
    const activeDevice = await prisma.registeredDevice.findFirstOrThrow({
      where: { tenantId, employeeId, status: 'ACTIVE' },
    });
    const attempt = (overrides: Record<string, unknown> = {}) => ({
      type: 'CHECKIN',
      deviceUuid: activeDevice.deviceUuid,
      attestationToken: 'dev-integrity-ok',
      clientTime: new Date().toISOString(),
      requestId: randomUUID(),
      latitude: 23.588,
      longitude: 58.3829,
      accuracyMeters: 8,
      appVersion: '1.0.0',
      osVersion: '16',
      ...overrides,
    });

    await api(employee)
      .post('/attendance/punches')
      .send(attempt())
      .expect(422)
      .expect(({ body }) => expectSafeFailure(body, 'NO_OFFICE_ASSIGNED'));
    expect(
      await prisma.attendanceVerificationLog.count({
        where: { tenantId, employeeId, verificationStatus: 'FAILED' },
      }),
    ).toBe(1);
    expect(
      await prisma.attendanceEvent.count({ where: { tenantId, employeeId } }),
    ).toBe(0);

    const office = await prisma.officeLocation.create({
      data: {
        tenantId,
        officeName: `Muscat Test Office ${stamp}`,
        latitude: 23.588,
        longitude: 58.3829,
        radiusMeters: 150,
        egressIps: ['127.0.0.0/8'],
      },
    });
    await prisma.employeeOfficeAssignment.create({
      data: {
        tenantId,
        employeeId,
        officeLocationId: office.id,
        isPrimary: true,
      },
    });

    await api(employee)
      .post('/attendance/punches')
      .send(attempt())
      .expect(201)
      .expect(({ body }) => {
        const response = body as {
          verification: { status: string; checks: unknown[] };
        };
        expect(response.verification.status).toBe('PASSED');
        expect(response.verification.checks).toHaveLength(5);
        expect(response.verification.checks).toContainEqual({
          check: 'face',
          passed: true,
          skipped: true,
        });
      });
    const event = await prisma.attendanceEvent.findFirstOrThrow({
      where: { tenantId, employeeId },
    });
    expect(event.source).toBe('MOBILE');
    expect(event.verificationLogId).not.toBeNull();
    expect(
      await prisma.attendanceVerificationLog.count({
        where: { tenantId, employeeId, verificationStatus: 'PASSED' },
      }),
    ).toBe(1);

    await api(employee)
      .post('/attendance/punches')
      .send(
        attempt({
          type: 'CHECKOUT',
          latitude: 23.608,
          longitude: 58.4029,
        }),
      )
      .expect(201)
      .expect(({ body }) => {
        const checks = (body as { verification: { checks: unknown[] } })
          .verification.checks;
        expect(checks).toContainEqual({
          check: 'location',
          passed: true,
          skipped: false,
        });
      });

    await prisma.officeLocation.update({
      where: { id: office.id },
      data: { egressIps: [] },
    });
    await prisma.employee.update({
      where: { id: employeeId },
      data: { workType: 'FIELD' },
    });
    await prisma.attendancePolicy.update({
      where: { id: optOutPolicy.id },
      data: { locationMode: 'FIELD_GPS' },
    });
    await api(employee)
      .post('/attendance/punches')
      .send(attempt({ accuracyMeters: 101 }))
      .expect(422)
      .expect(({ body }) => expectSafeFailure(body, 'GPS_ACCURACY_TOO_LOW'));
    await api(employee)
      .post('/attendance/punches')
      .send(attempt({ latitude: 23.75, longitude: 58.55 }))
      .expect(201);
    await prisma.employee.update({
      where: { id: employeeId },
      data: { workType: 'OFFICE' },
    });
    await prisma.attendancePolicy.update({
      where: { id: optOutPolicy.id },
      data: { locationMode: 'OFFICE_GEOFENCE' },
    });

    await api(employee)
      .post('/attendance/punches')
      .send(
        attempt({
          type: 'CHECKOUT',
          latitude: 23.608,
          longitude: 58.4029,
        }),
      )
      .expect(422)
      .expect(({ body }) => expectSafeFailure(body, 'OUTSIDE_GEOFENCE'));
    await api(employee)
      .post('/attendance/punches')
      .send(
        attempt({ type: 'CHECKOUT', attestationToken: 'dev-integrity-mock' }),
      )
      .expect(422)
      .expect(({ body }) => expectSafeFailure(body, 'MOCK_LOCATION'));

    await api(employee)
      .post('/biometric-consents')
      .send({ accepted: true, policyVersion: '1.2' })
      .expect(201);
    const enrollmentPresign = await api(employee)
      .post('/face-enrollments/presign')
      .send({
        filename: 'face-v2.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048,
      })
      .expect(201);
    const enrollmentKey = (enrollmentPresign.body as PresignBody).data
      .objectKey;
    await api(employee)
      .post('/face-enrollments')
      .send({
        privateObjectKey: enrollmentKey,
        livenessProofToken: `test-live:${enrollmentKey}`,
      })
      .expect(201);
    const mismatchPresign = await api(employee)
      .post('/attendance/punch-evidence/presign')
      .send({
        filename: 'mismatch.jpg',
        contentType: 'image/jpeg',
        fileSize: 2048,
      })
      .expect(201);
    const mismatchKey = (mismatchPresign.body as PresignBody).data.objectKey;
    for (let attemptNumber = 0; attemptNumber < 3; attemptNumber += 1) {
      await api(employee)
        .post('/attendance/punches')
        .send(attempt({ type: 'CHECKOUT', selfieKey: mismatchKey }))
        .expect(422)
        .expect(({ body }) => expectSafeFailure(body, 'FACE_MISMATCH'));
    }
    await api(employee)
      .post('/attendance/punches')
      .send(attempt({ type: 'CHECKOUT', selfieKey: mismatchKey }))
      .expect(429)
      .expect(({ body }) => expectSafeFailure(body, 'FACE_ATTEMPTS_EXCEEDED'));

    await api(employee)
      .post('/attendance/punches')
      .send(
        attempt({
          type: 'CHECKOUT',
          attestationToken: 'dev-integrity-rooted',
        }),
      )
      .expect(422)
      .expect(({ body }) => expectSafeFailure(body, 'ROOTED_DEVICE'));
    expect(
      await prisma.attendanceEvent.count({ where: { tenantId, employeeId } }),
    ).toBe(3);
    const alert = await prisma.securityAlert.findFirstOrThrow({
      where: { tenantId, employeeId, alertType: 'ROOTED_DEVICE' },
    });
    expect(alert.status).toBe('OPEN');

    await api(admin)
      .get('/verification-logs?status=FAILED')
      .expect(200)
      .expect(({ body }) => {
        const rows = (body as ListBody).data as Record<string, unknown>[];
        expect(rows).toHaveLength(9);
        expect(rows[0]).not.toHaveProperty('observedIp');
        expect(rows[0]).not.toHaveProperty('integrityVerdict');
        expect(rows[0]).not.toHaveProperty('selfieKey');
        expect(rows[0]).not.toHaveProperty('faceMatchScore');
      });
    await api(admin)
      .get(`/security-alerts/${alert.id}`)
      .expect(200)
      .expect(({ body }) =>
        expect((body as AlertBody).data.status).toBe('OPEN'),
      );
    await api(admin)
      .post(`/security-alerts/${alert.id}/acknowledge`)
      .send({ note: 'Security team is reviewing the device' })
      .expect(201)
      .expect(({ body }) =>
        expect((body as AlertBody).data.status).toBe('ACKNOWLEDGED'),
      );
    await api(admin)
      .post(`/security-alerts/${alert.id}/resolve`)
      .send({ note: 'Device was inspected and removed from service' })
      .expect(201)
      .expect(({ body }) =>
        expect((body as AlertBody).data.status).toBe('RESOLVED'),
      );

    const dismissibleAlert = await prisma.securityAlert.create({
      data: {
        tenantId,
        employeeId,
        ruleId: alert.ruleId,
        alertType: 'ROOTED_DEVICE',
        severity: 'WARNING',
        title: 'Duplicate rooted-device signal',
        details: { deviceId: activeDevice.id },
      },
    });
    await api(admin)
      .post(`/security-alerts/${dismissibleAlert.id}/dismiss`)
      .send({ note: 'Duplicate signal confirmed during HR review' })
      .expect(201)
      .expect(({ body }) =>
        expect((body as AlertBody).data.status).toBe('DISMISSED'),
      );
    await expect(
      prisma.securityAlert.findUniqueOrThrow({
        where: { id: dismissibleAlert.id },
        select: { status: true, resolutionNote: true },
      }),
    ).resolves.toEqual({
      status: 'DISMISSED',
      resolutionNote: 'Duplicate signal confirmed during HR review',
    });
  });

  it('keeps forensic and alert data tenant-isolated and verification logs immutable', async () => {
    const partitioning = await pool.query<{
      kind: string;
      partitions: string;
    }>(
      `SELECT parent.relkind AS kind, count(child.oid)::text AS partitions
       FROM pg_class parent
       LEFT JOIN pg_inherits inheritance ON inheritance.inhparent = parent.oid
       LEFT JOIN pg_class child ON child.oid = inheritance.inhrelid
       WHERE parent.oid = 'attendance_verification_logs'::regclass
       GROUP BY parent.relkind`,
    );
    expect(partitioning.rows[0]).toEqual({ kind: 'p', partitions: '4' });

    const userPool = new Pool({
      connectionString:
        process.env.DATABASE_URL_APP ??
        'postgresql://app_user:app_password@localhost:5433/hrms_dev?schema=public',
    });
    const client = await userPool.connect();
    try {
      const noContext = await client.query<{
        alerts: string;
        logs: string;
        rules: string;
      }>(
        'SELECT (SELECT count(*) FROM security_alerts)::text AS alerts, (SELECT count(*) FROM attendance_verification_logs)::text AS logs, (SELECT count(*) FROM alert_rules)::text AS rules',
      );
      expect(noContext.rows[0]).toEqual({
        alerts: '0',
        logs: '0',
        rules: '0',
      });

      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1::text, true)", [
        tenantId,
      ]);
      const scoped = await client.query<{ alerts: string; logs: string }>(
        'SELECT (SELECT count(*) FROM security_alerts)::text AS alerts, (SELECT count(*) FROM attendance_verification_logs)::text AS logs',
      );
      expect(Number(scoped.rows[0].alerts)).toBeGreaterThan(0);
      expect(Number(scoped.rows[0].logs)).toBeGreaterThan(0);
      await expect(
        client.query(
          'UPDATE attendance_verification_logs SET "userAgent" = $1 WHERE "tenantId" = $2',
          ['tampered', tenantId],
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK');

      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1::text, true)", [
        tenantId,
      ]);
      await expect(
        client.query(
          'UPDATE biometric_consents SET "policyVersion" = $1 WHERE "tenantId" = $2',
          ['tampered', tenantId],
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await userPool.end();
    }
  });

  function api(session: Session) {
    const withAuth = (test: request.Test) =>
      test
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('x-tenant-id', session.tenantId);
    return {
      get: (path: string) => withAuth(request(app.getHttpServer()).get(path)),
      post: (path: string) => withAuth(request(app.getHttpServer()).post(path)),
      patch: (path: string) =>
        withAuth(request(app.getHttpServer()).patch(path)),
      delete: (path: string) =>
        withAuth(request(app.getHttpServer()).delete(path)),
    };
  }

  async function createSession(
    roleName: keyof typeof DEFAULT_ROLE_PERMISSIONS,
  ): Promise<Session> {
    const password = 'Sprint5User123!';
    const email =
      roleName === 'EMPLOYEE'
        ? employeeEmail()
        : `${roleName.toLowerCase()}-${stamp}@sprint5.test`;
    const user = await factory.createUser({
      tenantId,
      email,
      passwordHash: await argon2.hash(password),
    });
    const role = await factory.createSystemRole(tenantId, roleName);
    await factory.assignRole(user.id, role.id);
    const session = await TenantContextService.run({ tenantId }, () =>
      auth.login(user.email, password, '127.0.0.1', 'sprint5-jest'),
    );
    return { tenantId, userId: user.id, ...session };
  }

  function employeeEmail() {
    return `employee-${stamp}@sprint5.test`;
  }
});
