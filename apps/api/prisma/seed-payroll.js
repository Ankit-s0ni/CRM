const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { createCipheriv, randomBytes } = require('node:crypto');
require('dotenv').config();

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEV_FALLBACK_KEY =
  'DeltCRM payroll development key - replace in production!';

const PAYROLL_PERMISSION_KEYS = [
  'payroll.settings.read',
  'payroll.settings.manage',
  'payroll.compensation.read',
  'payroll.compensation.manage',
  'payroll.protected-data.read',
  'payroll.protected-data.manage',
  'payroll.policies.read',
  'payroll.policies.manage',
  'payroll.components.read',
  'payroll.components.manage',
  'payroll.structures.read',
  'payroll.structures.manage',
  'payroll.accounting.read',
  'payroll.accounting.manage',
  'payroll.audit.read',
  'payroll.inputs.read',
  'payroll.inputs.manage',
  'payroll.runs.read',
  'payroll.runs.calculate',
  'payroll.runs.approve',
  'payroll.runs.finalize',
  'payroll.payments.read',
  'payroll.payments.manage',
  'payroll.payslips.self',
  'payroll.payslips.read',
  'payroll.payslips.publish',
  'payroll.reports.generate',
];

async function ensurePayrollPermissions(tenantId) {
  await prisma.permission.createMany({
    data: PAYROLL_PERMISSION_KEYS.map((key) => ({ key })),
    skipDuplicates: true,
  });
  const permissions = await prisma.permission.findMany({
    where: { key: { in: PAYROLL_PERMISSION_KEYS } },
  });
  const roles = await prisma.role.findMany({
    where: { tenantId, name: { in: ['BUSINESS_ADMIN', 'HR_ADMIN', 'EMPLOYEE'] } },
  });
  for (const role of roles) {
    const keys =
      role.name === 'EMPLOYEE'
        ? ['payroll.payslips.self', 'payroll.payslips.read']
        : PAYROLL_PERMISSION_KEYS;
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((item) => item.permissionId));
    const missing = permissions
      .filter((permission) => keys.includes(permission.key))
      .filter((permission) => !existingIds.has(permission.id))
      .map((permission) => ({ roleId: role.id, permissionId: permission.id }));
    if (missing.length) {
      await prisma.rolePermission.createMany({ data: missing });
    }
  }
}

function cipherKeyMaterial() {
  const configured = process.env.PAYROLL_DATA_ENCRYPTION_KEY;
  if (configured) return configured.padEnd(32, configured);
  return DEV_FALLBACK_KEY;
}

function encryptProtectedValue(value) {
  const key = Buffer.from(cipherKeyMaterial()).subarray(0, 32);
  const keyVersion = process.env.PAYROLL_DATA_KEY_VERSION ?? 'v1';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: [
      'aes-256-gcm',
      keyVersion,
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':'),
    keyVersion,
  };
}

function last4(value) {
  return value ? value.replace(/\s+/g, '').slice(-4) : undefined;
}

const POLICY_SEEDS = [
  {
    code: 'PRORATION-DEFAULT',
    name: 'Default proration (working days)',
    category: 'PRORATION',
    config: { schemaVersion: 'proration-v1', method: 'working-days' },
  },
  {
    code: 'WORKING-DAYS',
    name: 'Working day basis',
    category: 'WORKING_DAY_BASIS',
    config: { schemaVersion: 'working-day-v1', basis: 'WORKING_DAYS' },
  },
  {
    code: 'ROUNDING-STANDARD',
    name: 'Standard rounding (nearest baisa)',
    category: 'ROUNDING',
    config: { schemaVersion: 'rounding-v1', mode: 'nearest' },
  },
  {
    code: 'OT-DEFAULT',
    name: 'Overtime included as earnings',
    category: 'OVERTIME_TREATMENT',
    config: { schemaVersion: 'overtime-v1', method: 'include' },
  },
  {
    code: 'LOP-DEFAULT',
    name: 'Loss of pay deducted from earnings',
    category: 'LOSS_OF_PAY_TREATMENT',
    config: { schemaVersion: 'loss-of-pay-v1', method: 'deduct' },
  },
  {
    code: 'JOINER-DEFAULT',
    name: 'Joiners prorated by payable days',
    category: 'JOINER_TREATMENT',
    config: { schemaVersion: 'joiner-v1', method: 'prorate' },
  },
  {
    code: 'LEAVER-DEFAULT',
    name: 'Leavers prorated by payable days',
    category: 'LEAVER_TREATMENT',
    config: { schemaVersion: 'leaver-v1', method: 'prorate' },
  },
  {
    code: 'PAYMENT-BANK-TRANSFER',
    name: 'Bank transfer payment configuration',
    category: 'PAYMENT_CONFIGURATION',
    config: {
      schemaVersion: 'payment-configuration-v1',
      method: 'organization',
    },
  },
  {
    code: 'ACCOUNTING-DEFAULT',
    name: 'Default accounting configuration',
    category: 'ACCOUNTING_CONFIGURATION',
    config: { schemaVersion: 'accounting-configuration-v1' },
  },
];

const COMPONENT_SEEDS = [
  {
    code: 'BASIC',
    name: 'Basic salary',
    description: 'Basic monthly salary',
    type: 'EARNING',
    version: {
      valueMode: 'FIXED',
      taxable: true,
      statutory: false,
      recurring: true,
      calculationOrder: 10,
      currencyBehavior: 'EMPLOYEE_CURRENCY',
      roundingBehavior: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      config: { schemaVersion: 'component-v1', amountType: 'basic' },
    },
    structureAmountMinor: 450000n,
    accounting: { debitAccountCode: '5101', creditAccountCode: '2101' },
  },
  {
    code: 'HOUSING',
    name: 'Housing allowance',
    description: 'Monthly housing allowance',
    type: 'EARNING',
    version: {
      valueMode: 'FIXED',
      taxable: true,
      statutory: false,
      recurring: true,
      calculationOrder: 20,
      currencyBehavior: 'EMPLOYEE_CURRENCY',
      roundingBehavior: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      config: { schemaVersion: 'component-v1', amountType: 'gross' },
    },
    structureAmountMinor: 300000n,
    accounting: { debitAccountCode: '5102', creditAccountCode: '2102' },
  },
  {
    code: 'TRANSPORT',
    name: 'Transport allowance',
    description: 'Monthly transport allowance',
    type: 'EARNING',
    version: {
      valueMode: 'FIXED',
      taxable: false,
      statutory: false,
      recurring: true,
      calculationOrder: 30,
      currencyBehavior: 'EMPLOYEE_CURRENCY',
      roundingBehavior: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      config: { schemaVersion: 'component-v1', amountType: 'gross' },
    },
    structureAmountMinor: 100000n,
    accounting: { debitAccountCode: '5103', creditAccountCode: '2103' },
  },
  {
    code: 'OVERTIME',
    name: 'Overtime pay',
    description: 'Overtime earnings (fed via run inputs)',
    type: 'EARNING',
    version: {
      valueMode: 'FIXED',
      taxable: true,
      statutory: false,
      recurring: false,
      calculationOrder: 40,
      currencyBehavior: 'EMPLOYEE_CURRENCY',
      roundingBehavior: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      config: { schemaVersion: 'component-v1', amountType: 'gross' },
    },
    structureAmountMinor: 0n,
    accounting: { debitAccountCode: '5104', creditAccountCode: '2104' },
  },
  {
    code: 'SOCIAL_INSURANCE',
    name: 'Social insurance (employee share)',
    description: 'PASI employee contribution',
    type: 'DEDUCTION',
    version: {
      valueMode: 'FIXED',
      taxable: false,
      statutory: true,
      recurring: true,
      calculationOrder: 50,
      currencyBehavior: 'EMPLOYEE_CURRENCY',
      roundingBehavior: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      config: { schemaVersion: 'component-v1', amountType: 'basic' },
    },
    structureAmountMinor: 70000n,
    accounting: { debitAccountCode: '5105', creditAccountCode: '2205' },
  },
  {
    code: 'EMPLOYER_SI',
    name: 'Social insurance (employer share)',
    description: 'PASI employer contribution',
    type: 'EMPLOYER_CONTRIBUTION',
    version: {
      valueMode: 'FIXED',
      taxable: false,
      statutory: true,
      recurring: true,
      calculationOrder: 60,
      currencyBehavior: 'EMPLOYEE_CURRENCY',
      roundingBehavior: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      config: { schemaVersion: 'component-v1', amountType: 'basic' },
    },
    structureAmountMinor: 105000n,
    accounting: { debitAccountCode: '5106', creditAccountCode: '2206' },
  },
];

const EFFECTIVE_FROM = '2026-01-01';

const DEFAULT_PERIOD = {
  periodKey: '2026-07',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-31',
  attendanceSource: 'attendance-lock:2026-07',
  attendanceChecksum: 'sha256:seed-acme-2026-07',
  attendanceVersion: 'attendance-lock-v1',
};

async function seedCompletePayroll(tenantId, adminUserId, options = {}) {
  await ensurePayrollPermissions(tenantId);

  const employeeCodes = options.employeeCodes ?? ['ACME-001'];
  const baseMinorByCode =
    options.baseMinorByCode ?? { 'ACME-001': 1000000n };
  const period = options.period ?? DEFAULT_PERIOD;
  const snapshotByCode = options.snapshotByCode ?? {
    'ACME-001': {
      payableDays: 23,
      lossOfPayDays: 0,
      overtimeMinutes: 300,
      snapshot: {
        workDays: 26,
        presentDays: 23,
        leaveDays: 3,
        weeklyOffDays: 5,
        source: period.attendanceSource,
      },
    },
  };
  const inputs = options.inputs ?? [
    {
      employeeCode: 'ACME-001',
      kind: 'ONE_TIME',
      code: 'BONUS',
      amountMinor: 50000n,
      currency: 'OMR',
      payload: { reason: 'July performance bonus' },
      idempotencyKey: 'seed:acme:2026-07:bonus',
    },
    {
      employeeCode: 'ACME-001',
      kind: 'ONE_TIME',
      code: 'OVERTIME_PAY',
      amountMinor: 45000n,
      currency: 'OMR',
      payload: { minutes: 300, rate: '1.25x' },
      idempotencyKey: 'seed:acme:2026-07:overtime',
    },
  ];

  const logs = [];

  const settings = await prisma.payrollSettings.upsert({
    where: { tenantId },
    update: {
      countryCode: 'OM',
      defaultCurrency: 'OMR',
      locale: 'en-OM',
      timezone: 'Asia/Muscat',
      payFrequency: 'MONTHLY',
      defaultPayPeriodRule: { type: 'calendar-month' },
      defaultPayoutDateRule: { type: 'offset-after-period-end', days: 3 },
      workingDayBasis: 'WORKING_DAYS',
      defaultProrationPolicy: {
        schemaVersion: 'proration-v1',
        method: 'working-days',
      },
      defaultRoundingPolicy: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      moduleStatus: 'ACTIVE',
      updatedBy: adminUserId,
    },
    create: {
      tenantId,
      countryCode: 'OM',
      defaultCurrency: 'OMR',
      locale: 'en-OM',
      timezone: 'Asia/Muscat',
      payFrequency: 'MONTHLY',
      defaultPayPeriodRule: { type: 'calendar-month' },
      defaultPayoutDateRule: { type: 'offset-after-period-end', days: 3 },
      workingDayBasis: 'WORKING_DAYS',
      defaultProrationPolicy: {
        schemaVersion: 'proration-v1',
        method: 'working-days',
      },
      defaultRoundingPolicy: { schemaVersion: 'rounding-v1', mode: 'nearest' },
      moduleStatus: 'ACTIVE',
      effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
      effectiveTo: null,
      createdBy: adminUserId,
    },
  });
  logs.push(`PayrollSettings ${settings.id}`);

  let calendar = await prisma.payrollCalendar.findFirst({
    where: { tenantId, code: 'MONTHLY-OM', version: 1 },
  });
  if (!calendar) {
    calendar = await prisma.payrollCalendar.create({
      data: {
        tenantId,
        code: 'MONTHLY-OM',
        name: 'Monthly Oman',
        frequency: 'MONTHLY',
        periodStartRule: { type: 'month-start' },
        periodEndRule: { type: 'month-end' },
        payoutDateRule: { type: 'offset-after-period-end', days: 3 },
        timezone: 'Asia/Muscat',
        effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        effectiveTo: null,
        status: 'ACTIVE',
        createdBy: adminUserId,
      },
    });
  } else {
    await prisma.payrollCalendar.update({
      where: { id: calendar.id },
      data: { status: 'ACTIVE' },
    });
  }
  logs.push(`PayrollCalendar ${calendar.id}`);

  const policyIdByCode = new Map();
  for (const seed of POLICY_SEEDS) {
    const policy = await prisma.payrollPolicy.upsert({
      where: { tenantId_code: { tenantId, code: seed.code } },
      update: {
        name: seed.name,
        category: seed.category,
        updatedBy: adminUserId,
      },
      create: {
        tenantId,
        code: seed.code,
        name: seed.name,
        category: seed.category,
        createdBy: adminUserId,
      },
    });
    policyIdByCode.set(seed.code, policy.id);
    const version = await prisma.payrollPolicyVersion.findFirst({
      where: { tenantId, policyId: policy.id, version: 1 },
    });
    if (version) {
      await prisma.payrollPolicyVersion.update({
        where: { id: version.id },
        data: {
          status: 'ACTIVE',
          config: seed.config,
          activatedAt: new Date(),
          activatedBy: adminUserId,
        },
      });
    } else {
      await prisma.payrollPolicyVersion.create({
        data: {
          tenantId,
          policyId: policy.id,
          version: 1,
          status: 'ACTIVE',
          sourceLevel: 'ORGANIZATION',
          sourceEntityId: null,
          supportsOverrides: true,
          config: seed.config,
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          activatedAt: new Date(),
          activatedBy: adminUserId,
          createdBy: adminUserId,
        },
      });
    }
    logs.push(`PayrollPolicy ${seed.code} ${policy.id}`);
  }

  const approvalPolicy = await prisma.payrollApprovalPolicy.upsert({
    where: { tenantId },
    update: { name: 'Two-step payroll approval', updatedBy: adminUserId },
    create: { tenantId, name: 'Two-step payroll approval', createdBy: adminUserId },
  });
  const approvalVersion = await prisma.payrollApprovalPolicyVersion.findFirst({
    where: { tenantId, approvalPolicyId: approvalPolicy.id, version: 1 },
  });
  if (approvalVersion) {
    await prisma.payrollApprovalPolicyVersion.update({
      where: { id: approvalVersion.id },
      data: {
        status: 'ACTIVE',
        fourEyesEnabled: true,
        makerCanApprove: false,
        requiredLevels: 2,
        allowedPermissions: ['payroll.runs.approve'],
        allowedRoleKeys: ['HR_ADMIN', 'BUSINESS_ADMIN'],
        activatedAt: new Date(),
        activatedBy: adminUserId,
      },
    });
  } else {
    await prisma.payrollApprovalPolicyVersion.create({
      data: {
        tenantId,
        approvalPolicyId: approvalPolicy.id,
        version: 1,
        status: 'ACTIVE',
        fourEyesEnabled: true,
        makerCanApprove: false,
        requiredLevels: 2,
        allowedPermissions: ['payroll.runs.approve'],
        allowedRoleKeys: ['HR_ADMIN', 'BUSINESS_ADMIN'],
        effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        effectiveTo: null,
        activatedAt: new Date(),
        activatedBy: adminUserId,
        createdBy: adminUserId,
      },
    });
  }
  logs.push(`PayrollApprovalPolicy ${approvalPolicy.id}`);

  const componentVersionIdByCode = new Map();
  for (const seed of COMPONENT_SEEDS) {
    const component = await prisma.payComponent.upsert({
      where: { tenantId_code: { tenantId, code: seed.code } },
      update: {
        name: seed.name,
        description: seed.description,
        type: seed.type,
        updatedBy: adminUserId,
      },
      create: {
        tenantId,
        code: seed.code,
        name: seed.name,
        description: seed.description,
        type: seed.type,
        createdBy: adminUserId,
      },
    });
    let version = await prisma.payComponentVersion.findFirst({
      where: { tenantId, componentId: component.id, version: 1 },
    });
    if (version) {
      await prisma.payComponentVersion.update({
        where: { id: version.id },
        data: {
          ...seed.version,
          status: 'ACTIVE',
          activatedAt: new Date(),
          activatedBy: adminUserId,
        },
      });
    } else {
      version = await prisma.payComponentVersion.create({
        data: {
          tenantId,
          componentId: component.id,
          version: 1,
          ...seed.version,
          status: 'ACTIVE',
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          activatedAt: new Date(),
          activatedBy: adminUserId,
          createdBy: adminUserId,
        },
      });
    }
    componentVersionIdByCode.set(seed.code, version.id);
    logs.push(`PayComponent ${seed.code} ${component.id}`);
  }

  const payGroup = await prisma.payGroup.upsert({
    where: { tenantId_code: { tenantId, code: 'MONTHLY-OM' } },
    update: {
      name: 'Monthly Oman Staff',
      description: 'All monthly salaried staff in Oman',
      currency: 'OMR',
      countryCode: 'OM',
      calendarId: calendar.id,
      overtimePolicyId: policyIdByCode.get('OT-DEFAULT'),
      lossOfPayPolicyId: policyIdByCode.get('LOP-DEFAULT'),
      approvalPolicyId: approvalPolicy.id,
      updatedBy: adminUserId,
    },
    create: {
      tenantId,
      calendarId: calendar.id,
      name: 'Monthly Oman Staff',
      code: 'MONTHLY-OM',
      description: 'All monthly salaried staff in Oman',
      currency: 'OMR',
      countryCode: 'OM',
      overtimePolicyId: policyIdByCode.get('OT-DEFAULT'),
      lossOfPayPolicyId: policyIdByCode.get('LOP-DEFAULT'),
      approvalPolicyId: approvalPolicy.id,
      effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
      effectiveTo: null,
      createdBy: adminUserId,
    },
  });
  logs.push(`PayGroup ${payGroup.id}`);

  const structure = await prisma.salaryStructure.upsert({
    where: { tenantId_code: { tenantId, code: 'OM-MONTHLY' } },
    update: {
      payGroupId: payGroup.id,
      name: 'Oman monthly salary structure',
      description: 'Standard monthly structure for Omani payroll',
      currency: 'OMR',
      updatedBy: adminUserId,
    },
    create: {
      tenantId,
      payGroupId: payGroup.id,
      code: 'OM-MONTHLY',
      name: 'Oman monthly salary structure',
      description: 'Standard monthly structure for Omani payroll',
      currency: 'OMR',
      createdBy: adminUserId,
    },
  });
  let structureVersion = await prisma.salaryStructureVersion.findFirst({
    where: { tenantId, structureId: structure.id, version: 1 },
  });
  if (!structureVersion) {
    structureVersion = await prisma.salaryStructureVersion.create({
      data: {
        tenantId,
        structureId: structure.id,
        version: 1,
        status: 'ACTIVE',
        effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        effectiveTo: null,
        activatedAt: new Date(),
        activatedBy: adminUserId,
        createdBy: adminUserId,
      },
    });
  } else {
    await prisma.salaryStructureVersion.update({
      where: { id: structureVersion.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        activatedBy: adminUserId,
      },
    });
  }
  for (const seed of COMPONENT_SEEDS) {
    const componentVersionId = componentVersionIdByCode.get(seed.code);
    const existing = await prisma.salaryStructureVersionComponent.findUnique({
      where: {
        tenantId_salaryStructureVersionId_payComponentVersionId: {
          tenantId,
          salaryStructureVersionId: structureVersion.id,
          payComponentVersionId: componentVersionId,
        },
      },
    });
    if (existing) {
      await prisma.salaryStructureVersionComponent.update({
        where: { id: existing.id },
        data: { fixedAmountMinor: seed.structureAmountMinor },
      });
    } else {
      await prisma.salaryStructureVersionComponent.create({
        data: {
          tenantId,
          salaryStructureVersionId: structureVersion.id,
          payComponentVersionId: componentVersionId,
          fixedAmountMinor: seed.structureAmountMinor,
          percentageBasisPoints: null,
          formulaReference: null,
          calculationOrder: seed.version.calculationOrder,
          required: true,
        },
      });
    }
  }
  logs.push(`SalaryStructure ${structure.id} v${structureVersion.version}`);

  for (const seed of COMPONENT_SEEDS) {
    const component = await prisma.payComponent.findUnique({
      where: { tenantId_code: { tenantId, code: seed.code } },
    });
    const latest = await prisma.payrollAccountingMapping.findFirst({
      where: { tenantId, payComponentId: component.id },
      orderBy: { version: 'desc' },
    });
    if (latest) {
      await prisma.payrollAccountingMapping.update({
        where: { id: latest.id },
        data: {
          debitAccountCode: seed.accounting.debitAccountCode,
          creditAccountCode: seed.accounting.creditAccountCode,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.payrollAccountingMapping.create({
        data: {
          tenantId,
          payComponentId: component.id,
          debitAccountCode: seed.accounting.debitAccountCode,
          creditAccountCode: seed.accounting.creditAccountCode,
          costCenterRule: { mode: 'department', value: 'OPERATIONS' },
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          version: 1,
          createdBy: adminUserId,
        },
      });
    }
  }
  logs.push(`PayrollAccountingMappings ${COMPONENT_SEEDS.length}`);

  const employeeByCode = new Map();
  for (const employeeCode of employeeCodes) {
    const employee = await prisma.employee.findFirst({
      where: { tenantId, employeeCode },
    });
    if (!employee) throw new Error(`Employee ${employeeCode} not found`);
    employeeByCode.set(employeeCode, employee);
  }

  for (const [index, employeeCode] of employeeCodes.entries()) {
    const employee = employeeByCode.get(employeeCode);

    const assignment = await prisma.payGroupEmployeeAssignment.upsert({
      where: {
        tenantId_employeeId_payGroupId_effectiveFrom: {
          tenantId,
          employeeId: employee.id,
          payGroupId: payGroup.id,
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        },
      },
      update: { status: 'ACTIVE', assignedBy: adminUserId },
      create: {
        tenantId,
        payGroupId: payGroup.id,
        employeeId: employee.id,
        effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        effectiveTo: null,
        status: 'ACTIVE',
        assignedBy: adminUserId,
      },
    });

    const profile = await prisma.employeePayrollProfile.upsert({
      where: { tenantId_employeeId: { tenantId, employeeId: employee.id } },
      update: {
        payGroupId: payGroup.id,
        payrollStatus: 'ACTIVE',
        payrollCountry: 'OM',
        paymentMethod: 'BANK_TRANSFER',
        salaryHold: false,
        updatedBy: adminUserId,
      },
      create: {
        tenantId,
        employeeId: employee.id,
        payGroupId: payGroup.id,
        payrollStatus: 'ACTIVE',
        payrollCountry: 'OM',
        paymentMethod: 'BANK_TRANSFER',
        salaryHold: false,
        effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        effectiveTo: null,
        metadata: { joinedAt: '2025-11-01', bankTransfer: true },
        createdBy: adminUserId,
      },
    });

    const baseAmountMinor = baseMinorByCode[employeeCode] ?? 1000000n;
    const compensation = await prisma.employeeCompensationVersion.findFirst({
      where: { tenantId, employeePayrollProfileId: profile.id, version: 1 },
    });
    if (compensation) {
      await prisma.employeeCompensationVersion.update({
        where: { id: compensation.id },
        data: {
          salaryStructureVersionId: structureVersion.id,
          baseAmountMinor,
          currency: 'OMR',
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
        },
      });
    } else {
      await prisma.employeeCompensationVersion.create({
        data: {
          tenantId,
          employeePayrollProfileId: profile.id,
          salaryStructureVersionId: structureVersion.id,
          baseAmountMinor,
          currency: 'OMR',
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          reason: 'Initial compensation on joining',
          version: 1,
          createdBy: adminUserId,
        },
      });
    }

    const accountNumber = (90215000000000n + BigInt(index)).toString();
    const account = encryptProtectedValue(accountNumber);
    const iban = encryptProtectedValue(`OM60BKMB00000000123${accountNumber}`);
    const paymentDetail = await prisma.employeePaymentDetail.findFirst({
      where: { tenantId, employeePayrollProfileId: profile.id },
    });
    if (paymentDetail) {
      await prisma.employeePaymentDetail.update({
        where: { id: paymentDetail.id },
        data: {
          paymentMethod: 'BANK_TRANSFER',
          bankName: 'Bank Muscat',
          accountHolderName: employee.fullName,
          accountNumberCiphertext: account.ciphertext,
          accountNumberLast4: last4(accountNumber),
          ibanCiphertext: iban.ciphertext,
          ibanLast4: last4(`OM60BKMB00000000123${accountNumber}`),
          swiftBic: 'BKMBOMRXXXX',
          encryptionKeyVersion: account.keyVersion,
          status: 'ACTIVE',
          updatedBy: adminUserId,
        },
      });
    } else {
      await prisma.employeePaymentDetail.create({
        data: {
          tenantId,
          employeePayrollProfileId: profile.id,
          paymentMethod: 'BANK_TRANSFER',
          bankName: 'Bank Muscat',
          accountHolderName: employee.fullName,
          accountNumberCiphertext: account.ciphertext,
          accountNumberLast4: last4(accountNumber),
          ibanCiphertext: iban.ciphertext,
          ibanLast4: last4(`OM60BKMB00000000123${accountNumber}`),
          swiftBic: 'BKMBOMRXXXX',
          encryptionKeyVersion: account.keyVersion,
          status: 'ACTIVE',
          version: 1,
          updatedBy: adminUserId,
        },
      });
    }

    const civilId = encryptProtectedValue(`823000000${String(index).padStart(2, '0')}`);
    const statutory = await prisma.employeeStatutoryDetail.findFirst({
      where: { tenantId, employeePayrollProfileId: profile.id },
    });
    if (statutory) {
      await prisma.employeeStatutoryDetail.update({
        where: { id: statutory.id },
        data: {
          countryCode: 'OM',
          identifierType: 'CIVIL_ID',
          identifierCiphertext: civilId.ciphertext,
          identifierLast4: last4(`823000000${String(index).padStart(2, '0')}`),
          encryptionKeyVersion: civilId.keyVersion,
          metadata: { issuingAuthority: 'Royal Oman Police' },
          status: 'ACTIVE',
          updatedBy: adminUserId,
        },
      });
    } else {
      await prisma.employeeStatutoryDetail.create({
        data: {
          tenantId,
          employeePayrollProfileId: profile.id,
          countryCode: 'OM',
          identifierType: 'CIVIL_ID',
          identifierCiphertext: civilId.ciphertext,
          identifierLast4: last4(`823000000${String(index).padStart(2, '0')}`),
          encryptionKeyVersion: civilId.keyVersion,
          metadata: { issuingAuthority: 'Royal Oman Police' },
          status: 'ACTIVE',
          version: 1,
          updatedBy: adminUserId,
        },
      });
    }

    logs.push(
      `Employee ${employeeCode}: profile ${profile.id}, compensation v1 (${(Number(baseAmountMinor) / 1000).toFixed(3)} OMR), payment + statutory details`,
    );
  }

  let run = await prisma.payrollRun.findFirst({
    where: { tenantId, payGroupId: payGroup.id, periodKey: period.periodKey },
  });
  if (!run) {
    run = await prisma.payrollRun.create({
      data: {
        tenantId,
        payGroupId: payGroup.id,
        periodKey: period.periodKey,
        periodStart: new Date(`${period.periodStart}T00:00:00.000Z`),
        periodEnd: new Date(`${period.periodEnd}T00:00:00.000Z`),
        status: 'DRAFT',
        attendanceSource: period.attendanceSource,
        attendanceChecksum: period.attendanceChecksum,
        attendanceVersion: period.attendanceVersion,
        inputVersion: 1,
        readiness: { ready: false, staleReason: 'pending_validation' },
        createdBy: adminUserId,
      },
    });
    await prisma.payrollRunTimeline.create({
      data: {
        tenantId,
        payrollRunId: run.id,
        action: 'payroll.run.created',
        actorUserId: adminUserId,
        payload: {
          periodKey: period.periodKey,
          payGroupId: payGroup.id,
          seeded: true,
        },
      },
    });
  }
  if (['DRAFT', 'VALIDATING'].includes(run.status)) {
    await prisma.payrollRunEmployee.deleteMany({
      where: { tenantId, payrollRunId: run.id },
    });
    await prisma.payrollRunInput.deleteMany({
      where: { tenantId, payrollRunId: run.id },
    });
    for (const employeeCode of employeeCodes) {
      const employee = employeeByCode.get(employeeCode);
      const profile = await prisma.employeePayrollProfile.findFirst({
        where: { tenantId, employeeId: employee.id },
      });
      const snapshot = snapshotByCode[employeeCode] ?? {
        payableDays: 22,
        lossOfPayDays: 0,
        overtimeMinutes: 0,
        snapshot: { workDays: 22, source: period.attendanceSource },
      };
      await prisma.payrollRunEmployee.create({
        data: {
          tenantId,
          payrollRunId: run.id,
          employeeId: employee.id,
          employeePayrollProfileId: profile.id,
          attendanceSnapshot: snapshot.snapshot ?? {},
          payableDays: snapshot.payableDays,
          lossOfPayDays: snapshot.lossOfPayDays ?? 0,
          overtimeMinutes: snapshot.overtimeMinutes ?? 0,
        },
      });
    }
    for (const input of inputs) {
      const employee = employeeByCode.get(input.employeeCode);
      await prisma.payrollRunInput.create({
        data: {
          tenantId,
          payrollRunId: run.id,
          employeeId: employee.id,
          kind: input.kind,
          code: input.code,
          amountMinor: input.amountMinor,
          currency: input.currency,
          payload: input.payload ?? {},
          idempotencyKey: input.idempotencyKey,
          createdBy: adminUserId,
        },
      });
    }
    logs.push(
      `PayrollRun ${run.id} (${period.periodKey}, DRAFT, ${employeeCodes.length} employees, ${inputs.length} inputs)`,
    );
  } else {
    logs.push(
      `PayrollRun ${run.id} (${period.periodKey}) left untouched (status ${run.status})`,
    );
  }

  return logs;
}

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'acme' },
  });
  if (!tenant) {
    console.error('Acme tenant not found. Run the main seed first.');
    process.exitCode = 1;
    return;
  }
  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: 'admin@acme.com' },
  });
  if (!admin) throw new Error('admin@acme.com user not found');

  const logs = await seedCompletePayroll(tenant.id, admin.id);
  console.log('Payroll seed complete for Acme Logistics:');
  for (const line of logs) console.log(`  - ${line}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}

module.exports = { seedCompletePayroll };
