import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DepartmentsService } from './departments.service';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';
import { EmployeeQuotaService } from './employee-quota.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { OrganizationController } from './organization.controller';
import { EmployeeImportsController } from './imports/employee-imports.controller';
import { EmployeeImportsService } from './imports/employee-imports.service';
import { EmployeeImportStorageService } from './imports/employee-import-storage.service';
import { EmployeeImportProcessor } from './imports/employee-import.processor';
import { EmployeeImportQueue } from './imports/employee-import.queue';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { EMPLOYEE_DOCUMENT_STORAGE } from './domain/employee-document-storage.interface';
import { S3EmployeeDocumentStorage } from './infrastructure/s3-employee-document-storage';
import { EmployeeHistoryService } from './employee-history.service';
import { CreateEmployeeHandler } from './application/commands/create-employee.handler';
import { SyncBillingOnEmployeeCreatedHandler } from './application/events/sync-billing-on-employee-created.handler';
import { IEmployeeRepository } from './domain/employee.repository.interface';
import { PrismaEmployeeRepository } from './infrastructure/prisma-employee.repository';

const CommandHandlers = [CreateEmployeeHandler];
const EventHandlers = [SyncBillingOnEmployeeCreatedHandler];

@Module({
  imports: [CqrsModule],
  controllers: [
    OrganizationController,
    DesignationsController,
    EmployeesController,
    EmployeeImportsController,
    EmployeeDocumentsController,
  ],
  providers: [
    DepartmentsService,
    DesignationsService,
    EmployeeQuotaService,
    EmployeesService,
    EmployeeImportsService,
    EmployeeImportStorageService,
    EmployeeImportProcessor,
    EmployeeImportQueue,
    EmployeeDocumentsService,
    EmployeeHistoryService,
    S3EmployeeDocumentStorage,
    {
      provide: EMPLOYEE_DOCUMENT_STORAGE,
      useExisting: S3EmployeeDocumentStorage,
    },
    ...CommandHandlers,
    ...EventHandlers,
    {
      provide: IEmployeeRepository,
      useClass: PrismaEmployeeRepository,
    },
  ],
  exports: [
    EmployeeImportStorageService,
    EmployeeImportProcessor,
    EmployeeImportQueue,
  ],
})
export class OrganizationModule {}
