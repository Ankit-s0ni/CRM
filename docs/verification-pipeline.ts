// =====================================================================
// verification-pipeline.ts — the core of the product, as designed in §4.1
// ---------------------------------------------------------------------
// Layout shown in one file for review; in the repo it splits along the
// comment banners into attendance/domain, attendance/application, and
// attendance/infrastructure per the Phase 3 folder structure.
//
// Design goals made concrete here:
//  * OCP: a new factor (PIN, NFC beacon) = one new VerificationCheck class
//    + a policy flag. Pipeline assembly is the ONLY place that changes.
//  * Every attempt — pass or FAIL — persists a VerificationLog (§1.2.3).
//  * All verdicts computed server-side from raw inputs (§1.6.2).
//  * Failures short-circuit but still log + emit SecurityViolationDetected.
// =====================================================================

// =====================================================================
// DOMAIN — value objects, ports, checks
// =====================================================================

export interface GeoPoint { lat: number; lng: number; accuracyM: number }

export class Geofence {
  constructor(readonly center: GeoPoint, readonly radiusM: number) {}

  /** Haversine, plus the client's GPS accuracy as tolerance. */
  contains(p: GeoPoint): { inside: boolean; distanceM: number } {
    const R = 6371000;
    const dLat = ((p.lat - this.center.lat) * Math.PI) / 180;
    const dLng = ((p.lng - this.center.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((this.center.lat * Math.PI) / 180) *
        Math.cos((p.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distanceM = 2 * R * Math.asin(Math.sqrt(a));
    return { inside: distanceM <= this.radiusM + p.accuracyM, distanceM };
  }
}

/** Machine-readable reasons — the mobile app maps these to UX, HR alerts key on them. */
export type FailureReason =
  | 'DEVICE_NOT_REGISTERED' | 'DEVICE_BLOCKED' | 'DEVICE_NOT_OWNED'
  | 'INTEGRITY_FAILED' | 'MOCK_LOCATION' | 'ROOTED_DEVICE'
  | 'OUTSIDE_GEOFENCE' | 'GPS_ACCURACY_TOO_LOW' | 'NO_OFFICE_ASSIGNED'
  | 'FACE_MISMATCH' | 'LIVENESS_FAILED' | 'FACE_NOT_ENROLLED' | 'CONSENT_MISSING'
  | 'EMPLOYEE_INACTIVE';

export interface CheckResult {
  check: string;
  passed: boolean;
  reasons: FailureReason[];
  /** merged into VerificationLog columns/JSON (faceMatchScore, distance, verdicts…) */
  evidence: Record<string, unknown>;
}

export interface VerificationContext {
  tenantId: string;
  employee: EmployeeSnapshot;          // read-model from Organization BC
  policy: EffectivePolicy;             // PolicyResolver output (employee>dept>default)
  settings: { faceMatchThreshold: number };
  request: {
    type: 'CHECKIN' | 'CHECKOUT';
    deviceUuid?: string;
    integrityToken?: string;           // Play Integrity / App Attest, raw
    location?: GeoPoint;
    clientMockLocationFlag?: boolean;  // advisory only — never trusted alone
    selfieKey?: string;                // object-storage key of the just-captured selfie
    observedIp: string;                // from the HTTP layer, NOT the client body
    source: 'MOBILE' | 'WEB';
  };
}

export interface VerificationVerdict {
  passed: boolean;
  results: CheckResult[];
  reasons: FailureReason[];
  deviceId?: string;
  faceMatchScore?: number;
}

/** The OCP seam. */
export interface VerificationCheck {
  readonly name: string;
  evaluate(ctx: VerificationContext): Promise<CheckResult>;
}

// ---- Ports (implemented in infrastructure; swap providers freely, §DIP) ----
export interface FaceMatchProvider {
  /** Compares stored enrollment vs new selfie; both referenced by storage key. */
  compare(enrolledRef: string, selfieKey: string): Promise<{ score: number; livenessOk: boolean }>;
}
export interface DeviceIntegrityProvider {
  /** Verifies Play Integrity / App Attest token SERVER-side with the vendor. */
  verify(token: string, platform: 'IOS' | 'ANDROID'):
    Promise<{ genuineDevice: boolean; mockLocation: boolean; rooted: boolean; raw: unknown }>;
}
export interface DeviceRegistry {
  findActive(tenantId: string, deviceUuid: string):
    Promise<{ id: string; employeeId: string; platform: 'IOS' | 'ANDROID' } | null>;
}
export interface OfficeDirectory {
  assignedOffices(tenantId: string, employeeId: string):
    Promise<{ id: string; geofence: Geofence; egressIps: string[] }[]>;
}
export interface ConsentStore {
  hasActiveBiometricConsent(tenantId: string, employeeId: string): Promise<boolean>;
}

// ---------------------------------------------------------------
// Check 1: registered device
// ---------------------------------------------------------------
export class DeviceCheck implements VerificationCheck {
  readonly name = 'device';
  constructor(private readonly devices: DeviceRegistry) {}

  async evaluate(ctx: VerificationContext): Promise<CheckResult> {
    if (!ctx.policy.requireRegisteredDevice || ctx.request.source === 'WEB') {
      return pass(this.name, { skipped: true });
    }
    if (!ctx.request.deviceUuid) return fail(this.name, ['DEVICE_NOT_REGISTERED'], {});

    const device = await this.devices.findActive(ctx.tenantId, ctx.request.deviceUuid);
    if (!device) return fail(this.name, ['DEVICE_NOT_REGISTERED'], {});
    if (device.employeeId !== ctx.employee.id) {
      // Someone punching from a colleague's phone — a favorite fraud pattern.
      return fail(this.name, ['DEVICE_NOT_OWNED'], { deviceId: device.id });
    }
    return pass(this.name, { deviceId: device.id, platform: device.platform });
  }
}

// ---------------------------------------------------------------
// Check 2: device integrity (attestation, mock location, root)
// ---------------------------------------------------------------
export class IntegrityCheck implements VerificationCheck {
  readonly name = 'integrity';
  constructor(private readonly integrity: DeviceIntegrityProvider) {}

  async evaluate(ctx: VerificationContext): Promise<CheckResult> {
    if (ctx.request.source === 'WEB') return pass(this.name, { skipped: true });
    if (!ctx.request.integrityToken) return fail(this.name, ['INTEGRITY_FAILED'], {});

    const platform = ctx.request.deviceUuid ? await this.platformOf(ctx) : 'ANDROID';
    const v = await this.integrity.verify(ctx.request.integrityToken, platform);

    const reasons: FailureReason[] = [];
    if (!v.genuineDevice) reasons.push('INTEGRITY_FAILED');
    if (v.rooted) reasons.push('ROOTED_DEVICE');
    if (v.mockLocation || ctx.request.clientMockLocationFlag) reasons.push('MOCK_LOCATION');

    const evidence = { integrityVerdict: v.raw, mockLocation: v.mockLocation };
    return reasons.length ? fail(this.name, reasons, evidence) : pass(this.name, evidence);
  }

  private async platformOf(_ctx: VerificationContext): Promise<'IOS' | 'ANDROID'> {
    return 'ANDROID'; // resolved from the device record in the real adapter
  }
}

// ---------------------------------------------------------------
// Check 3: location — strategy per work_type (§1.3.12)
//   OFFICE : geofence OR office egress IP (the spec's literal OR)
//   FIELD  : GPS required + recorded; geofence not applicable
//   HYBRID : geofence if inside any assigned office, else field rules
// ---------------------------------------------------------------
export class LocationCheck implements VerificationCheck {
  readonly name = 'location';
  constructor(private readonly offices: OfficeDirectory) {}

  async evaluate(ctx: VerificationContext): Promise<CheckResult> {
    if (!ctx.policy.requireGeofence && ctx.employee.workType !== 'FIELD') {
      return pass(this.name, { skipped: true });
    }
    const loc = ctx.request.location;

    if (ctx.employee.workType === 'FIELD') {
      if (!loc) return fail(this.name, ['GPS_ACCURACY_TOO_LOW'], {});
      if (loc.accuracyM > 100) {
        return fail(this.name, ['GPS_ACCURACY_TOO_LOW'], { accuracyM: loc.accuracyM });
      }
      return pass(this.name, { gpsValid: true, lat: loc.lat, lng: loc.lng });
    }

    const assigned = await this.offices.assignedOffices(ctx.tenantId, ctx.employee.id);
    if (assigned.length === 0) return fail(this.name, ['NO_OFFICE_ASSIGNED'], {});

    // Leg A: server-observed request IP against office egress IPs
    const ipMatch = assigned.find((o) => o.egressIps.includes(ctx.request.observedIp));
    if (ipMatch) {
      return pass(this.name, { via: 'OFFICE_IP', officeId: ipMatch.id, observedIp: ctx.request.observedIp });
    }
    // Leg B: geofence
    if (loc) {
      let best = { distanceM: Number.POSITIVE_INFINITY, officeId: '' };
      for (const o of assigned) {
        const r = o.geofence.contains(loc);
        if (r.inside) return pass(this.name, { via: 'GEOFENCE', officeId: o.id, distanceM: r.distanceM });
        if (r.distanceM < best.distanceM) best = { distanceM: r.distanceM, officeId: o.id };
      }
      // distance feeds the "2 km outside the job site" HR alert verbatim
      return fail(this.name, ['OUTSIDE_GEOFENCE'], { nearestOfficeId: best.officeId, distanceM: Math.round(best.distanceM) });
    }
    return fail(this.name, ['OUTSIDE_GEOFENCE'], { observedIp: ctx.request.observedIp, noGps: true });
  }
}

// ---------------------------------------------------------------
// Check 4: face match (consent-gated, threshold from tenant settings)
// ---------------------------------------------------------------
export class FaceCheck implements VerificationCheck {
  readonly name = 'face';
  constructor(
    private readonly faces: FaceMatchProvider,
    private readonly consents: ConsentStore,
  ) {}

  async evaluate(ctx: VerificationContext): Promise<CheckResult> {
    if (!ctx.policy.requireFaceMatch) return pass(this.name, { skipped: true });

    if (!(await this.consents.hasActiveBiometricConsent(ctx.tenantId, ctx.employee.id))) {
      // Consent revoked ≠ fraud. Policy resolution should have routed this
      // employee to a GPS-only policy; reaching here is a config gap → fail
      // closed but with a distinct reason so HR sees "fix config", not "fraud".
      return fail(this.name, ['CONSENT_MISSING'], {});
    }
    if (!ctx.employee.faceEmbeddingRef) return fail(this.name, ['FACE_NOT_ENROLLED'], {});
    if (!ctx.request.selfieKey) return fail(this.name, ['FACE_MISMATCH'], { noSelfie: true });

    const { score, livenessOk } = await this.faces.compare(
      ctx.employee.faceEmbeddingRef,
      ctx.request.selfieKey,
    );
    const evidence = { faceMatchScore: score, livenessOk };
    if (!livenessOk) return fail(this.name, ['LIVENESS_FAILED'], evidence);
    if (score < ctx.settings.faceMatchThreshold) return fail(this.name, ['FACE_MISMATCH'], evidence);
    return pass(this.name, evidence);
  }
}

const pass = (check: string, evidence: Record<string, unknown>): CheckResult =>
  ({ check, passed: true, reasons: [], evidence });
const fail = (check: string, reasons: FailureReason[], evidence: Record<string, unknown>): CheckResult =>
  ({ check, passed: false, reasons, evidence });

// =====================================================================
// DOMAIN SERVICE — pipeline assembly + execution
// =====================================================================
export class VerificationPipeline {
  constructor(
    private readonly deviceCheck: DeviceCheck,
    private readonly integrityCheck: IntegrityCheck,
    private readonly locationCheck: LocationCheck,
    private readonly faceCheck: FaceCheck,
  ) {}

  /** Assembly order is deliberate: cheap/local checks before paid provider calls. */
  private chainFor(ctx: VerificationContext): VerificationCheck[] {
    const chain: VerificationCheck[] = [];
    if (ctx.request.source === 'MOBILE') chain.push(this.deviceCheck, this.integrityCheck);
    chain.push(this.locationCheck);
    if (ctx.policy.requireFaceMatch) chain.push(this.faceCheck);
    return chain;
  }

  async run(ctx: VerificationContext): Promise<VerificationVerdict> {
    if (ctx.employee.status !== 'ACTIVE') {
      return { passed: false, results: [], reasons: ['EMPLOYEE_INACTIVE'] };
    }
    const results: CheckResult[] = [];
    for (const check of this.chainFor(ctx)) {
      const r = await check.evaluate(ctx);
      results.push(r);
      if (!r.passed) break; // short-circuit; the partial trail still gets logged
    }
    const reasons = results.flatMap((r) => r.reasons);
    return {
      passed: results.every((r) => r.passed),
      results,
      reasons,
      deviceId: evidenceOf(results, 'deviceId') as string | undefined,
      faceMatchScore: evidenceOf(results, 'faceMatchScore') as number | undefined,
    };
  }
}
const evidenceOf = (rs: CheckResult[], key: string) =>
  rs.map((r) => r.evidence[key]).find((v) => v !== undefined);

// =====================================================================
// APPLICATION — the check-in use-case (NestJS service)
// =====================================================================
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
// import { PrismaService, currentContext } from '../shared/tenancy.extension';

@Injectable()
export class CheckInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: VerificationPipeline,
    private readonly policyResolver: PolicyResolver,     // employee > dept > default
    private readonly shiftResolver: ShiftResolver,       // roster > default > flexible
    private readonly dateAttributor: AttendanceDateAttributor, // night-shift rule §1.3.1
    private readonly verificationLogs: VerificationLogWriter,
    private readonly days: AttendanceDayRepositoryPort,
    private readonly calculator: AttendanceCalculator,   // pure, exhaustively unit-tested
  ) {}

  async checkIn(cmd: CheckInCommand): Promise<CheckInResultDto> {
    const ctx = currentContext();
    const employee = await this.loadEmployee(cmd.employeeId);
    const policy = await this.policyResolver.resolve(employee);
    const settings = await this.loadSettings();

    const vctx: VerificationContext = {
      tenantId: ctx.tenantId, employee, policy, settings,
      request: { type: 'CHECKIN', ...cmd.request },
    };

    const verdict = await this.pipeline.run(vctx);

    // 1. ALWAYS persist the attempt — the superset stream (§1.2.3)
    const verificationLogId = await this.verificationLogs.write(vctx, verdict);

    // 2. Failure: no attendance event; emit the security signal; actionable error
    if (!verdict.passed) {
      await this.emitOutbox('attendance.check_in_rejected', {
        employeeId: employee.id, reasons: verdict.reasons, verificationLogId,
      });
      throw new UnprocessableEntityException({
        code: verdict.reasons[0],           // e.g. OUTSIDE_GEOFENCE
        reasons: verdict.reasons,
        details: publicDetails(verdict),    // e.g. { distanceM: 2140 } — never raw verdicts
      });
    }

    // 3. Success: append through the aggregate, recompute, emit — atomically
    const shift = await this.shiftResolver.resolve(employee, cmd.request.eventTime);
    const date = this.dateAttributor.attribute(cmd.request.eventTime, shift, employee.timezone);

    return this.prisma.forTenant(async (tx) => {
      const day = await this.days.loadOrCreateForUpdate(tx, employee.id, date); // row lock
      day.appendEvent({
        type: 'CHECKIN', source: cmd.request.source,
        eventTime: cmd.request.eventTime,
        location: cmd.request.location,
        verificationLogId,
        clientEventUuid: cmd.clientEventUuid, // idempotency (unique index dedupes replays)
      }); // throws DomainError on double check-in etc. — invariants live in the aggregate
      day.recompute(this.calculator, shift, policy);
      await this.days.saveWithEvents(tx, day, [
        { eventKey: 'attendance.employee_checked_in',
          payload: { employeeId: employee.id, date, at: cmd.request.eventTime } },
      ]);
      return day.toTimelineDto();
    });
  }

  private emitOutbox(eventKey: string, payload: unknown) {
    return this.prisma.forTenant((tx) =>
      tx.outboxEvent.create({ data: { tenantId: currentContext().tenantId, eventKey, payload: payload as any } }));
  }
  private loadEmployee(_id: string): Promise<EmployeeSnapshot> { return null as any; }
  private loadSettings(): Promise<{ faceMatchThreshold: number }> { return null as any; }
}

/** Only safe, user-facing evidence leaves the server. */
function publicDetails(v: VerificationVerdict): Record<string, unknown> {
  const d = v.results.at(-1)?.evidence ?? {};
  const allow = ['distanceM', 'nearestOfficeId', 'accuracyM'];
  return Object.fromEntries(Object.entries(d).filter(([k]) => allow.includes(k)));
}

// ---- Supporting types referenced above (live in their own files) ----
export interface EmployeeSnapshot {
  id: string; status: 'ACTIVE' | 'ON_NOTICE' | 'TERMINATED';
  workType: 'OFFICE' | 'FIELD' | 'HYBRID';
  faceEmbeddingRef?: string; timezone: string;
}
export interface EffectivePolicy {
  requireFaceMatch: boolean; requireRegisteredDevice: boolean; requireGeofence: boolean;
  lateAfterMinutes: number; allowEarlyCheckin: boolean; maxOfflineSyncHours: number;
}
export interface CheckInCommand {
  employeeId: string; clientEventUuid?: string;
  request: VerificationContext['request'] & { eventTime: Date };
}
export interface CheckInResultDto { [k: string]: unknown }
declare class PolicyResolver { resolve(e: EmployeeSnapshot): Promise<EffectivePolicy> }
declare class ShiftResolver { resolve(e: EmployeeSnapshot, at: Date): Promise<unknown> }
declare class AttendanceDateAttributor { attribute(at: Date, shift: unknown, tz: string): string }
declare class VerificationLogWriter { write(c: VerificationContext, v: VerificationVerdict): Promise<string> }
declare class AttendanceCalculator {}
declare class AttendanceDayRepositoryPort {
  loadOrCreateForUpdate(tx: unknown, employeeId: string, date: string): Promise<AttendanceDayAggregate>;
  saveWithEvents(tx: unknown, day: AttendanceDayAggregate, events: { eventKey: string; payload: unknown }[]): Promise<void>;
}
declare class AttendanceDayAggregate {
  appendEvent(e: unknown): void;
  recompute(c: AttendanceCalculator, shift: unknown, policy: EffectivePolicy): void;
  toTimelineDto(): CheckInResultDto;
}
declare class PrismaService {
  forTenant<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}
declare function currentContext(): { tenantId: string };
