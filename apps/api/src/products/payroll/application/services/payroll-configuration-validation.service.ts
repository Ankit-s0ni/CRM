import { BadRequestException } from '@nestjs/common';
import { PayrollPolicyCategory } from '@prisma/client';
import type {
  PayrollPayoutDateRuleDto,
  PayrollPeriodRuleDto,
  PayrollPolicyConfigDto,
} from '../dto/payroll-configuration.dto';

const policySchemaVersions: Record<PayrollPolicyCategory, string> = {
  PRORATION: 'proration-v1',
  WORKING_DAY_BASIS: 'working-day-v1',
  ROUNDING: 'rounding-v1',
  OVERTIME_TREATMENT: 'overtime-v1',
  LOSS_OF_PAY_TREATMENT: 'loss-of-pay-v1',
  JOINER_TREATMENT: 'joiner-v1',
  LEAVER_TREATMENT: 'leaver-v1',
  APPROVAL_WORKFLOW: 'approval-workflow-v1',
  PAYMENT_CONFIGURATION: 'payment-configuration-v1',
  ACCOUNTING_CONFIGURATION: 'accounting-configuration-v1',
};

export function assertPeriodRule(rule: PayrollPeriodRuleDto, field: string) {
  if (
    (rule.type === 'fixed-day' || rule.type === 'day-of-month') &&
    rule.day === undefined
  ) {
    invalid(field, 'day is required for fixed-day and day-of-month rules');
  }
  if (
    (rule.type === 'calendar-month' ||
      rule.type === 'month-start' ||
      rule.type === 'month-end') &&
    rule.day !== undefined
  ) {
    invalid(field, 'day is not supported for calendar-month boundary rules');
  }
}

export function assertPayoutDateRule(rule: PayrollPayoutDateRuleDto) {
  if (rule.type === 'fixed-day' && rule.day === undefined) {
    invalid('payoutDateRule', 'day is required for fixed-day payout rules');
  }
  if (
    (rule.type === 'offset-after-period-end' ||
      rule.type === 'configured-day-after-close') &&
    rule.days === undefined
  ) {
    invalid('payoutDateRule', 'days is required for offset payout-date rules');
  }
}

export function assertPolicyConfigForCategory(
  category: PayrollPolicyCategory,
  config: PayrollPolicyConfigDto,
) {
  const expected = policySchemaVersions[category];
  if (config.schemaVersion && config.schemaVersion !== expected) {
    invalid(
      'config.schemaVersion',
      `unsupported schema version for ${category}; expected ${expected}`,
    );
  }

  if (category === 'PRORATION') {
    if (!config.method) invalid('config.method', 'method is required');
    if (config.method === 'fixed-days' && config.fixedDays === undefined) {
      invalid('config.fixedDays', 'fixedDays is required for fixed-days');
    }
    return;
  }

  if (category === 'WORKING_DAY_BASIS') {
    if (!config.basis && !config.method) {
      invalid('config.basis', 'basis or method is required');
    }
    return;
  }

  if (category === 'ROUNDING') {
    if (!config.mode && !config.method) {
      invalid('config.mode', 'mode or method is required');
    }
    return;
  }

  if (
    category === 'OVERTIME_TREATMENT' ||
    category === 'LOSS_OF_PAY_TREATMENT' ||
    category === 'JOINER_TREATMENT' ||
    category === 'LEAVER_TREATMENT'
  ) {
    if (!config.method) invalid('config.method', 'method is required');
  }
}

function invalid(field: string, message: string): never {
  throw new BadRequestException({
    code: 'PAYROLL_CONFIGURATION_INVALID',
    field,
    message,
  });
}
