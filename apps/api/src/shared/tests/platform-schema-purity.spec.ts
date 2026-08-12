/**
 * @file platform-schema-purity.spec.ts
 * @description Architecture test: ensures the Platform Prisma schema contains
 * only Platform-owned models and that Platform runtime source code does not
 * import HRMS-owned Prisma models.
 *
 * This test MUST pass before merging any schema or service changes.
 * Failing this test means a cross-boundary violation has been introduced.
 *
 * Phase 0 Exit Gate: "Every persisted entity and public capability has
 * exactly one owning service."
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_SCHEMA_PATH = path.resolve(
  __dirname,
  '../../../prisma/platform/schema.prisma',
);

const PLATFORM_SRC_PATH = path.resolve(__dirname, '../../platform');

/**
 * HRMS-owned model names that must NEVER appear in the Platform schema or
 * Platform runtime source code as Prisma model identifiers.
 */
const HRMS_MODEL_NAMES = [
  // Organization
  'Department',
  'Designation',
  'Employee',
  'EmployeeDocument',
  'EmploymentEvent',
  'OfficeLocation',
  'EmployeeOfficeAssignment',
  // Attendance config
  'AttendancePolicy',
  'PolicyAssignment',
  'Shift',
  'EmployeeShiftRoster',
  'TenantHoliday',
  // Attendance runtime
  'RegisteredDevice',
  'AttendanceLog',
  'AttendanceEvent',
  'AttendanceVerificationLog',
  'AttendanceException',
  'AttendanceJobRun',
  'FieldTrackingSession',
  'FieldLocationPing',
  'FieldPingReceipt',
  'FieldRouteSummary',
  'AttendanceSyncReceipt',
  'DeviceIntegrityChallenge',
  'RegularizationRequest',
  'BiometricConsent',
  'FaceEnrollment',
  // Leave
  'LeavePolicy',
  'LeaveBalance',
  'LeaveBalanceLedger',
  'LeaveRequest',
  // Payroll
  'PayrollLockPeriod',
  'PayrollLockHistory',
  'PayrollSettings',
  'PayrollCalendar',
  'PayGroup',
  'PayGroupEmployeeAssignment',
  'PayrollPolicy',
  'PayrollPolicyVersion',
  'PayComponent',
  'PayComponentVersion',
  'SalaryStructure',
  'SalaryStructureVersion',
  'SalaryStructureVersionComponent',
  'EmployeePayrollProfile',
  'EmployeeCompensationVersion',
  'EmployeePaymentDetail',
  'EmployeeStatutoryDetail',
  'PayrollApprovalPolicy',
  'PayrollApprovalPolicyVersion',
  'PayrollAccountingMapping',
  'PayrollRun',
  'PayrollRunEmployee',
  'PayrollRunInput',
  'PayrollRunBlocker',
  'PayrollRunTimeline',
  'PayrollInputImport',
  'PayrollValidationRun',
  'PayrollValidationIssue',
  'PayrollEmployeeResult',
  'PayrollComponentResult',
  'PayrollPayslip',
  'PayrollOutputExport',
  'PayrollPaymentBatch',
  'PayrollJobRun',
  'PayrollCountryRulePack',
  // HRMS infrastructure
  'ImportJob',
  'RosterImportRow',
  'EmployeeImportRow',
  'ReportExport',
  // Security/Alert (HRMS-owned because they reference Employee)
  'AlertRule',
  'SecurityAlert',
  'TenantAuditLog',
];

/**
 * HRMS-owned enum names that must not appear in the Platform-only schema.
 */
const HRMS_ENUM_NAMES = [
  'PayrollModuleStatus',
  'PayrollFrequency',
  'PayrollRecordStatus',
  'PayrollVersionStatus',
  'PayrollRunStatus',
  'PayrollCalculationResultStatus',
  'PayrollOutputKind',
  'PayrollOutputStatus',
  'PayrollPaymentStatus',
  'PayrollCountryPackStatus',
  'PayrollJobKind',
  'PayrollRunBlockerSeverity',
  'PayrollInputImportStatus',
  'PayrollValidationIssueStatus',
  'PayrollInputKind',
  'PayrollPolicyCategory',
  'PayrollPolicySourceLevel',
  'PayComponentType',
  'PayComponentValueMode',
  'PayrollPaymentMethod',
  'EmployeePayrollStatus',
  'PayrollProtectedDetailStatus',
  'WorkType',
  'EmployeeStatus',
  'EmploymentEventType',
  'ImportKind',
  'JobStatus',
  'ImportRowStatus',
  'DevicePlatform',
  'DeviceStatus',
  'FaceEnrollmentStatus',
  'BiometricConsentAction',
  'AttendanceStatus',
  'EventType',
  'PunchSource',
  'VerificationType',
  'VerificationStatus',
  'LocationMethod',
  'AttendanceLocationMode',
  'SelfieMode',
  'ExceptionType',
  'ExceptionSource',
  'RequestStatus',
  'PolicyScope',
  'TrackingEndReason',
  'FieldIngestionStatus',
  'AttendanceSyncStatus',
  'LockStatus',
  'ReportType',
  'ReportFormat',
  'PayrollLockAction',
  'LeaveBalanceEntryType',
  'AlertRuleType',
  'SecurityAlertType',
  'HolidaySource',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readSchemaContent(): string {
  if (!fs.existsSync(PLATFORM_SCHEMA_PATH)) {
    throw new Error(
      `Platform-only schema not found at: ${PLATFORM_SCHEMA_PATH}`,
    );
  }
  return fs.readFileSync(PLATFORM_SCHEMA_PATH, 'utf-8');
}

function extractModelsFromSchema(schemaContent: string): string[] {
  const matches = schemaContent.matchAll(/^model\s+(\w+)\s*\{/gm);
  return [...matches].map((m) => m[1]);
}

function extractEnumsFromSchema(schemaContent: string): string[] {
  const matches = schemaContent.matchAll(/^enum\s+(\w+)\s*\{/gm);
  return [...matches].map((m) => m[1]);
}

function findTsFilesRecursive(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTsFilesRecursive(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Platform Schema Purity (Phase 0 Architecture Gate)', () => {
  let schemaContent: string;

  beforeAll(() => {
    schemaContent = readSchemaContent();
  });

  describe('Platform-only schema.prisma must not contain HRMS models', () => {
    it('should not contain any HRMS-owned model declarations', () => {
      const schemaModels = extractModelsFromSchema(schemaContent);
      const violations = schemaModels.filter((m) =>
        HRMS_MODEL_NAMES.includes(m),
      );
      expect(violations).toEqual([]);
    });

    it('should not contain any HRMS-owned enum declarations', () => {
      const schemaEnums = extractEnumsFromSchema(schemaContent);
      const violations = schemaEnums.filter((e) => HRMS_ENUM_NAMES.includes(e));
      expect(violations).toEqual([]);
    });
  });

  describe('Platform runtime source code must not use HRMS Prisma model names as identifiers', () => {
    /**
     * Checks that Platform TypeScript source files do not contain patterns like:
     *   prisma.employee.findMany(...)
     *   prismaService.attendanceLog.create(...)
     *   prisma.payrollRun.findFirst(...)
     *
     * These are the camelCase Prisma accessor patterns for HRMS tables.
     */
    it('should not access HRMS Prisma table accessors in Platform source', () => {
      const platformFiles = findTsFilesRecursive(PLATFORM_SRC_PATH);
      const violations: string[] = [];

      const hrmsAccessors = HRMS_MODEL_NAMES.map(
        // Convert PascalCase to camelCase Prisma accessor pattern
        (name) => name.charAt(0).toLowerCase() + name.slice(1),
      );

      for (const filePath of platformFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(
          path.resolve(__dirname, '../../../..'),
          filePath,
        );

        for (const accessor of hrmsAccessors) {
          // Match patterns like: prisma.employee., this.prisma.employee., prismaService.employee.
          const pattern = new RegExp(
            `\\bprisma(?:Service)?[.\\s]*\\b${accessor}\\b`,
            'i',
          );
          if (pattern.test(content)) {
            violations.push(`${relPath}: uses HRMS accessor .${accessor}`);
          }
        }
      }

      if (violations.length > 0) {
        fail(
          `Platform source code accesses HRMS-owned Prisma models:\n\n` +
            violations.map((v) => `  ❌ ${v}`).join('\n') +
            `\n\nPlatform must NOT query HRMS tables. Use the HRMS API or ` +
            `product contract events instead.`,
        );
      }
    });

    it('should not import from HRMS application packages', () => {
      const platformFiles = findTsFilesRecursive(PLATFORM_SRC_PATH);
      const violations: string[] = [];

      const forbiddenImportPatterns = [
        // Direct HRMS repo imports
        /from\s+['"]@deltcrm\/hrms/,
        /from\s+['"]deltcrm-hrms/,
        // HRMS-generated Prisma client
        /from\s+['"].*generated\/hrms-client/,
        /from\s+['"].*prisma\/hrms/,
      ];

      for (const filePath of platformFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(
          path.resolve(__dirname, '../../../..'),
          filePath,
        );

        for (const pattern of forbiddenImportPatterns) {
          if (pattern.test(content)) {
            violations.push(
              `${relPath}: forbidden import matching ${pattern.source}`,
            );
          }
        }
      }

      if (violations.length > 0) {
        fail(
          `Platform source code imports HRMS application code:\n\n` +
            violations.map((v) => `  ❌ ${v}`).join('\n') +
            `\n\nPlatform may only import from deltcrm-product-contracts.`,
        );
      }
    });
  });

  describe('Platform-only schema must pass prisma validate', () => {
    it('should be a valid Prisma schema', () => {
      expect(() => {
        execSync(`npx prisma validate --schema=${PLATFORM_SCHEMA_PATH} 2>&1`, {
          cwd: path.resolve(__dirname, '../../..'),
          encoding: 'utf-8',
        });
      }).not.toThrow();
    });
  });
});
