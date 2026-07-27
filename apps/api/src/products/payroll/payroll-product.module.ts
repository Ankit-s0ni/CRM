import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PayrollAdministrationCommandHandlers } from './application/handlers/payroll-administration.command-handlers';
import { PayrollAdministrationQueryHandlers } from './application/handlers/payroll-administration.query-handlers';
import { PayrollFoundationCommandHandlers } from './application/handlers/payroll-foundation.command-handlers';
import { PayrollFoundationQueryHandlers } from './application/handlers/payroll-foundation.query-handlers';
import { PAYROLL_FOUNDATION_REPOSITORY } from './application/ports/payroll-foundation.repository';
import { PROTECTED_PAYROLL_DATA_CIPHER } from './application/ports/protected-payroll-data-cipher';
import { PayrollAccountingAdministrationService } from './application/services/payroll-accounting-administration.service';
import { PayrollAdministrationService } from './application/services/payroll-administration.service';
import { PayrollApprovalAdministrationService } from './application/services/payroll-approval-administration.service';
import { PayrollAuditQueryService } from './application/services/payroll-audit-query.service';
import { PayrollCalendarAdministrationService } from './application/services/payroll-calendar-administration.service';
import { PayrollCountryRulePackService } from './application/services/payroll-country-rule-pack.service';
import { EffectivePayrollPolicyResolver } from './application/services/effective-payroll-policy.resolver';
import { PayrollPolicyAdministrationService } from './application/services/payroll-policy-administration.service';
import { PayrollProcessingService } from './application/services/payroll-processing.service';
import { PayrollProtectedDataService } from './application/services/payroll-protected-data.service';
import { PayrollRunPreparationService } from './application/services/payroll-run-preparation.service';
import { AesGcmProtectedPayrollDataCipher } from './infrastructure/encryption/aes-gcm-protected-payroll-data-cipher';
import { PrismaPayrollFoundationRepository } from './infrastructure/repositories/prisma-payroll-foundation.repository';
import { PayrollAdministrationController } from './presentation/controllers/payroll-administration.controller';
import { PayrollCountryRulePackController } from './presentation/controllers/payroll-country-rule-pack.controller';
import { PayrollFoundationController } from './presentation/controllers/payroll-foundation.controller';
import { PayrollProcessingController } from './presentation/controllers/payroll-processing.controller';
import { PayrollRunPreparationController } from './presentation/controllers/payroll-run-preparation.controller';

@Module({
  imports: [CqrsModule],
  controllers: [
    PayrollFoundationController,
    PayrollAdministrationController,
    PayrollRunPreparationController,
    PayrollProcessingController,
    PayrollCountryRulePackController,
  ],
  providers: [
    EffectivePayrollPolicyResolver,
    PayrollAdministrationService,
    PayrollCalendarAdministrationService,
    PayrollPolicyAdministrationService,
    PayrollProtectedDataService,
    PayrollRunPreparationService,
    PayrollProcessingService,
    PayrollCountryRulePackService,
    PayrollApprovalAdministrationService,
    PayrollAccountingAdministrationService,
    PayrollAuditQueryService,
    AesGcmProtectedPayrollDataCipher,
    PrismaPayrollFoundationRepository,
    {
      provide: PAYROLL_FOUNDATION_REPOSITORY,
      useExisting: PrismaPayrollFoundationRepository,
    },
    {
      provide: PROTECTED_PAYROLL_DATA_CIPHER,
      useExisting: AesGcmProtectedPayrollDataCipher,
    },
    ...PayrollAdministrationCommandHandlers,
    ...PayrollAdministrationQueryHandlers,
    ...PayrollFoundationCommandHandlers,
    ...PayrollFoundationQueryHandlers,
  ],
})
export class PayrollProductModule {}
