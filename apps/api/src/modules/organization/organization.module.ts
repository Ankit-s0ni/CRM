import { Module } from '@nestjs/common';
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
import { PrivateObjectStorageModule } from '../../shared/storage/private-object-storage.module';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';

@Module({
  imports: [PrivateObjectStorageModule],
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
  ],
  exports: [
    EmployeeImportStorageService,
    EmployeeImportProcessor,
    EmployeeImportQueue,
  ],
})
export class OrganizationModule {}
