const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { createCipheriv, randomBytes } = require('node:crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEV_FALLBACK_KEY =
  'DeltCRM payroll development key - replace in production!';

function encryptProtectedValue(value) {
  const rawKey = process.env.PAYROLL_ENCRYPTION_KEY ?? DEV_FALLBACK_KEY;
  const key = Buffer.from(rawKey.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const keyVersion = process.env.PAYROLL_ENCRYPTION_KEY_VERSION ?? 'dev-v1';
  return {
    ciphertext: [
      iv.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':'),
    keyVersion,
  };
}

function last4(value) {
  return value ? value.replace(/\s+/g, '').slice(-4) : undefined;
}

const EFFECTIVE_FROM = '2026-01-01';

const COMPONENT_CODES = ['BASIC', 'HOUSING', 'TRANSPORT', 'OVERTIME', 'SOCIAL_INSURANCE', 'EMPLOYER_SI'];

const STRUCTURE_AMOUNTS = {
  BASIC: 450000n,
  HOUSING: 300000n,
  TRANSPORT: 100000n,
  OVERTIME: 0n,
  SOCIAL_INSURANCE: 70000n,
  EMPLOYER_SI: 105000n,
};

const CALC_ORDER = {
  BASIC: 10,
  HOUSING: 20,
  TRANSPORT: 30,
  OVERTIME: 40,
  SOCIAL_INSURANCE: 50,
  EMPLOYER_SI: 60,
};

const PAY_GROUPS = [
  {
    code: 'MONTHLY-OM-C',
    name: 'Monthly Oman Staff - Group C',
    description: 'Monthly salaried staff in Oman - Group C',
    employeeCodes: ['ACME-003', 'ACME-004'],
    baseAmounts: { 'ACME-003': 1200000n, 'ACME-004': 950000n },
    structureCode: 'OM-MONTHLY-C',
    structureName: 'Oman monthly salary structure - Group C',
    periodKey: '2026-07',
  },
  {
    code: 'MONTHLY-OM-D',
    name: 'Monthly Oman Staff - Group D',
    description: 'Monthly salaried staff in Oman - Group D',
    employeeCodes: ['ACME-005', 'ACME-006'],
    baseAmounts: { 'ACME-005': 780000n, 'ACME-006': 1100000n },
    structureCode: 'OM-MONTHLY-D',
    structureName: 'Oman monthly salary structure - Group D',
    periodKey: '2026-07',
  },
  {
    code: 'MONTHLY-OM-E',
    name: 'Monthly Oman Staff - Group E',
    description: 'Monthly salaried staff in Oman - Group E',
    employeeCodes: ['ACME-007', 'ACME-008'],
    baseAmounts: { 'ACME-007': 1350000n, 'ACME-008': 880000n },
    structureCode: 'OM-MONTHLY-E',
    structureName: 'Oman monthly salary structure - Group E',
    periodKey: '2026-07',
  },
  {
    code: 'MONTHLY-OM-F',
    name: 'Monthly Oman Staff - Group F',
    description: 'Monthly salaried staff in Oman - Group F',
    employeeCodes: ['ACME-009', 'ACME-010'],
    baseAmounts: { 'ACME-009': 1020000n, 'ACME-010': 760000n },
    structureCode: 'OM-MONTHLY-F',
    structureName: 'Oman monthly salary structure - Group F',
    periodKey: '2026-07',
  },
];

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'acme' },
  });
  if (!tenant) throw new Error('Acme tenant not found. Run the main seed first.');

  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: 'admin@acme.com' },
  });
  if (!admin) throw new Error('admin@acme.com user not found.');

  const calendar = await prisma.payrollCalendar.findFirst({
    where: { tenantId: tenant.id, code: 'MONTHLY-OM', version: 1 },
  });
  if (!calendar) throw new Error('PayrollCalendar MONTHLY-OM not found. Run seed-payroll first.');

  const overtimePolicy = await prisma.payrollPolicy.findFirst({
    where: { tenantId: tenant.id, code: 'OT-DEFAULT' },
  });
  const lopPolicy = await prisma.payrollPolicy.findFirst({
    where: { tenantId: tenant.id, code: 'LOP-DEFAULT' },
  });
  const approvalPolicy = await prisma.payrollApprovalPolicy.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!approvalPolicy) throw new Error('PayrollApprovalPolicy not found. Run seed-payroll first.');

  const componentVersionIdByCode = new Map();
  for (const code of COMPONENT_CODES) {
    const component = await prisma.payComponent.findFirst({
      where: { tenantId: tenant.id, code },
    });
    if (!component) throw new Error(`PayComponent ${code} not found. Run seed-payroll first.`);
    const version = await prisma.payComponentVersion.findFirst({
      where: { tenantId: tenant.id, componentId: component.id, version: 1 },
    });
    if (!version) throw new Error(`PayComponentVersion ${code} v1 not found.`);
    componentVersionIdByCode.set(code, version.id);
  }

  for (const pg of PAY_GROUPS) {
    console.log(`--- Creating Pay Group: ${pg.code} (${pg.name}) ---`);

    const payGroup = await prisma.payGroup.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: pg.code } },
      update: {
        name: pg.name,
        description: pg.description,
        currency: 'OMR',
        countryCode: 'OM',
        calendarId: calendar.id,
        overtimePolicyId: overtimePolicy.id,
        lossOfPayPolicyId: lopPolicy.id,
        approvalPolicyId: approvalPolicy.id,
        updatedBy: admin.id,
      },
      create: {
        tenantId: tenant.id,
        calendarId: calendar.id,
        name: pg.name,
        code: pg.code,
        description: pg.description,
        currency: 'OMR',
        countryCode: 'OM',
        overtimePolicyId: overtimePolicy.id,
        lossOfPayPolicyId: lopPolicy.id,
        approvalPolicyId: approvalPolicy.id,
        effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
        effectiveTo: null,
        createdBy: admin.id,
      },
    });
    console.log(`  PayGroup: ${payGroup.id}`);

    const structure = await prisma.salaryStructure.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: pg.structureCode } },
      update: {
        payGroupId: payGroup.id,
        name: pg.structureName,
        description: `Standard monthly structure for ${pg.name}`,
        currency: 'OMR',
        updatedBy: admin.id,
      },
      create: {
        tenantId: tenant.id,
        payGroupId: payGroup.id,
        code: pg.structureCode,
        name: pg.structureName,
        description: `Standard monthly structure for ${pg.name}`,
        currency: 'OMR',
        createdBy: admin.id,
      },
    });

    let structureVersion = await prisma.salaryStructureVersion.findFirst({
      where: { tenantId: tenant.id, structureId: structure.id, version: 1 },
    });
    if (!structureVersion) {
      structureVersion = await prisma.salaryStructureVersion.create({
        data: {
          tenantId: tenant.id,
          structureId: structure.id,
          version: 1,
          status: 'ACTIVE',
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          activatedAt: new Date(),
          activatedBy: admin.id,
          createdBy: admin.id,
        },
      });
    } else {
      await prisma.salaryStructureVersion.update({
        where: { id: structureVersion.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
          activatedBy: admin.id,
        },
      });
    }

    for (const code of COMPONENT_CODES) {
      const componentVersionId = componentVersionIdByCode.get(code);
      const existing = await prisma.salaryStructureVersionComponent.findUnique({
        where: {
          tenantId_salaryStructureVersionId_payComponentVersionId: {
            tenantId: tenant.id,
            salaryStructureVersionId: structureVersion.id,
            payComponentVersionId: componentVersionId,
          },
        },
      });
      if (!existing) {
        await prisma.salaryStructureVersionComponent.create({
          data: {
            tenantId: tenant.id,
            salaryStructureVersionId: structureVersion.id,
            payComponentVersionId: componentVersionId,
            fixedAmountMinor: STRUCTURE_AMOUNTS[code],
            percentageBasisPoints: null,
            formulaReference: null,
            calculationOrder: CALC_ORDER[code],
            required: true,
          },
        });
      }
    }
    console.log(`  SalaryStructure: ${structure.id} v${structureVersion.version}`);

    for (const [index, employeeCode] of pg.employeeCodes.entries()) {
      const employee = await prisma.employee.findFirst({
        where: { tenantId: tenant.id, employeeCode },
      });
      if (!employee) throw new Error(`Employee ${employeeCode} not found`);

      await prisma.payGroupEmployeeAssignment.upsert({
        where: {
          tenantId_employeeId_payGroupId_effectiveFrom: {
            tenantId: tenant.id,
            employeeId: employee.id,
            payGroupId: payGroup.id,
            effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          },
        },
        update: { status: 'ACTIVE', assignedBy: admin.id },
        create: {
          tenantId: tenant.id,
          payGroupId: payGroup.id,
          employeeId: employee.id,
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          status: 'ACTIVE',
          assignedBy: admin.id,
        },
      });

      const profile = await prisma.employeePayrollProfile.upsert({
        where: { tenantId_employeeId: { tenantId: tenant.id, employeeId: employee.id } },
        update: {
          payGroupId: payGroup.id,
          payrollStatus: 'ACTIVE',
          payrollCountry: 'OM',
          paymentMethod: 'BANK_TRANSFER',
          salaryHold: false,
          updatedBy: admin.id,
        },
        create: {
          tenantId: tenant.id,
          employeeId: employee.id,
          payGroupId: payGroup.id,
          payrollStatus: 'ACTIVE',
          payrollCountry: 'OM',
          paymentMethod: 'BANK_TRANSFER',
          salaryHold: false,
          effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
          effectiveTo: null,
          metadata: { joinedAt: '2025-11-01', bankTransfer: true },
          createdBy: admin.id,
        },
      });

      const baseAmountMinor = pg.baseAmounts[employeeCode] ?? 1000000n;
      const compensation = await prisma.employeeCompensationVersion.findFirst({
        where: { tenantId: tenant.id, employeePayrollProfileId: profile.id, version: 1 },
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
            tenantId: tenant.id,
            employeePayrollProfileId: profile.id,
            salaryStructureVersionId: structureVersion.id,
            baseAmountMinor,
            currency: 'OMR',
            effectiveFrom: new Date(`${EFFECTIVE_FROM}T00:00:00.000Z`),
            effectiveTo: null,
            reason: 'Initial compensation on joining',
            version: 1,
            createdBy: admin.id,
          },
        });
      }

      const empNum = parseInt(employeeCode.split('-')[1]);
      const accountNumber = (90215000000000n + BigInt(empNum)).toString();
      const account = encryptProtectedValue(accountNumber);
      const iban = encryptProtectedValue(`OM60BKMB00000000123${accountNumber}`);
      const paymentDetail = await prisma.employeePaymentDetail.findFirst({
        where: { tenantId: tenant.id, employeePayrollProfileId: profile.id },
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
            updatedBy: admin.id,
          },
        });
      } else {
        await prisma.employeePaymentDetail.create({
          data: {
            tenantId: tenant.id,
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
            updatedBy: admin.id,
          },
        });
      }

      const civilId = encryptProtectedValue(`823000000${String(empNum).padStart(2, '0')}`);
      const statutory = await prisma.employeeStatutoryDetail.findFirst({
        where: { tenantId: tenant.id, employeePayrollProfileId: profile.id },
      });
      if (statutory) {
        await prisma.employeeStatutoryDetail.update({
          where: { id: statutory.id },
          data: {
            countryCode: 'OM',
            identifierType: 'CIVIL_ID',
            identifierCiphertext: civilId.ciphertext,
            identifierLast4: last4(`823000000${String(empNum).padStart(2, '0')}`),
            encryptionKeyVersion: civilId.keyVersion,
            metadata: { issuingAuthority: 'Royal Oman Police' },
            status: 'ACTIVE',
            updatedBy: admin.id,
          },
        });
      } else {
        await prisma.employeeStatutoryDetail.create({
          data: {
            tenantId: tenant.id,
            employeePayrollProfileId: profile.id,
            countryCode: 'OM',
            identifierType: 'CIVIL_ID',
            identifierCiphertext: civilId.ciphertext,
            identifierLast4: last4(`823000000${String(empNum).padStart(2, '0')}`),
            encryptionKeyVersion: civilId.keyVersion,
            metadata: { issuingAuthority: 'Royal Oman Police' },
            status: 'ACTIVE',
            version: 1,
            updatedBy: admin.id,
          },
        });
      }

      console.log(`  Employee ${employeeCode}: profile ${profile.id}, compensation (${(Number(baseAmountMinor) / 1000).toFixed(3)} OMR)`);
    }

    let run = await prisma.payrollRun.findFirst({
      where: { tenantId: tenant.id, payGroupId: payGroup.id, periodKey: pg.periodKey },
    });
    if (!run) {
      run = await prisma.payrollRun.create({
        data: {
          tenantId: tenant.id,
          payGroupId: payGroup.id,
          periodKey: pg.periodKey,
          periodStart: new Date('2026-07-01T00:00:00.000Z'),
          periodEnd: new Date('2026-07-31T00:00:00.000Z'),
          status: 'DRAFT',
          attendanceSource: 'attendance-lock:2026-07',
          attendanceChecksum: 'sha256:seed-acme-2026-07',
          attendanceVersion: 'attendance-lock-v1',
          inputVersion: 1,
          readiness: { ready: false, staleReason: 'pending_validation' },
          createdBy: admin.id,
        },
      });
      await prisma.payrollRunTimeline.create({
        data: {
          tenantId: tenant.id,
          payrollRunId: run.id,
          action: 'payroll.run.created',
          actorUserId: admin.id,
          payload: {
            periodKey: pg.periodKey,
            payGroupId: payGroup.id,
            seeded: true,
          },
        },
      });
    }

    if (['DRAFT', 'VALIDATING'].includes(run.status)) {
      await prisma.payrollRunEmployee.deleteMany({
        where: { tenantId: tenant.id, payrollRunId: run.id },
      });
      await prisma.payrollRunInput.deleteMany({
        where: { tenantId: tenant.id, payrollRunId: run.id },
      });
      for (const employeeCode of pg.employeeCodes) {
        const employee = await prisma.employee.findFirst({
          where: { tenantId: tenant.id, employeeCode },
        });
        const employeeProfile = await prisma.employeePayrollProfile.findFirst({
          where: { tenantId: tenant.id, employeeId: employee.id },
        });
        await prisma.payrollRunEmployee.create({
          data: {
            tenantId: tenant.id,
            payrollRunId: run.id,
            employeeId: employee.id,
            employeePayrollProfileId: employeeProfile.id,
            attendanceSnapshot: {
              workDays: 26,
              presentDays: 22,
              leaveDays: 4,
              weeklyOffDays: 5,
            },
            payableDays: 22,
            lossOfPayDays: 0,
            overtimeMinutes: 0,
          },
        });
      }
    }
    console.log(`  PayrollRun: ${run.id} (${pg.periodKey}, DRAFT, ${pg.employeeCodes.length} employees)\n`);
  }

  console.log('Done! Seeded 4 additional pay groups (C, D, E, F) with 2 employees each.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
