import 'reflect-metadata';
import { PayrollAdministrationController } from './payroll-administration.controller';
import { PayrollFoundationController } from './payroll-foundation.controller';
import { PayrollProcessingController } from './payroll-processing.controller';
import { PayrollRunPreparationController } from './payroll-run-preparation.controller';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { REQUIRED_MODULE_KEY } from '../../../../shared/authorization/require-module.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../../shared/authorization/require-permissions.decorator';

describe('Payroll route security metadata', () => {
  it('requires the payroll module entitlement on payroll controllers', () => {
    expect(
      Reflect.getMetadata(REQUIRED_MODULE_KEY, PayrollFoundationController),
    ).toBe('PAYROLL');
    expect(
      Reflect.getMetadata(REQUIRED_MODULE_KEY, PayrollAdministrationController),
    ).toBe('PAYROLL');
    expect(
      Reflect.getMetadata(REQUIRED_MODULE_KEY, PayrollRunPreparationController),
    ).toBe('PAYROLL');
    expect(
      Reflect.getMetadata(REQUIRED_MODULE_KEY, PayrollProcessingController),
    ).toBe('PAYROLL');
  });

  it.each([
    [
      PayrollFoundationController,
      'getSettings',
      PERMISSIONS.PAYROLL_SETTINGS_READ,
    ],
    [
      PayrollFoundationController,
      'updateSettings',
      PERMISSIONS.PAYROLL_SETTINGS_MANAGE,
    ],
    [
      PayrollFoundationController,
      'getCompensation',
      PERMISSIONS.PAYROLL_COMPENSATION_READ,
    ],
    [
      PayrollFoundationController,
      'createCompensation',
      PERMISSIONS.PAYROLL_COMPENSATION_MANAGE,
    ],
    [
      PayrollAdministrationController,
      'listPaymentDetails',
      PERMISSIONS.PAYROLL_PROTECTED_DATA_READ,
    ],
    [
      PayrollAdministrationController,
      'upsertPaymentDetail',
      PERMISSIONS.PAYROLL_PROTECTED_DATA_MANAGE,
    ],
    [
      PayrollAdministrationController,
      'listAccountingMappings',
      PERMISSIONS.PAYROLL_ACCOUNTING_READ,
    ],
    [
      PayrollAdministrationController,
      'createAccountingMapping',
      PERMISSIONS.PAYROLL_ACCOUNTING_MANAGE,
    ],
    [
      PayrollAdministrationController,
      'auditHistory',
      PERMISSIONS.PAYROLL_AUDIT_READ,
    ],
    [
      PayrollRunPreparationController,
      'previewInputCsv',
      PERMISSIONS.PAYROLL_INPUTS_MANAGE,
    ],
    [
      PayrollRunPreparationController,
      'commitInputImport',
      PERMISSIONS.PAYROLL_INPUTS_MANAGE,
    ],
    [
      PayrollRunPreparationController,
      'readiness',
      PERMISSIONS.PAYROLL_RUNS_READ,
    ],
    [
      PayrollRunPreparationController,
      'acknowledgeIssue',
      PERMISSIONS.PAYROLL_INPUTS_MANAGE,
    ],
    [
      PayrollProcessingController,
      'calculate',
      PERMISSIONS.PAYROLL_RUNS_CALCULATE,
    ],
    [
      PayrollProcessingController,
      'listMyPayslips',
      PERMISSIONS.PAYROLL_PAYSLIPS_SELF,
    ],
    [
      PayrollProcessingController,
      'listPayslips',
      PERMISSIONS.PAYROLL_PAYSLIPS_READ,
    ],
    [
      PayrollProcessingController,
      'downloadMyPayslip',
      PERMISSIONS.PAYROLL_PAYSLIPS_SELF,
    ],
    [
      PayrollProcessingController,
      'downloadPayslip',
      PERMISSIONS.PAYROLL_PAYSLIPS_READ,
    ],
    [
      PayrollProcessingController,
      'downloadOutput',
      PERMISSIONS.PAYROLL_REPORTS_GENERATE,
    ],
    [
      PayrollProcessingController,
      'generateOutput',
      PERMISSIONS.PAYROLL_REPORTS_GENERATE,
    ],
    [
      PayrollProcessingController,
      'markPaid',
      PERMISSIONS.PAYROLL_PAYMENTS_MANAGE,
    ],
    [PayrollProcessingController, 'listJobs', PERMISSIONS.PAYROLL_RUNS_READ],
  ])('requires %s on %s.%s', (controller, methodName, expectedPermission) => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        controller.prototype[methodName as keyof typeof controller.prototype],
      ),
    ).toEqual([expectedPermission]);
  });
});
