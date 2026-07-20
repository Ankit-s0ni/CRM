import { Module } from '@nestjs/common';
import { AttendanceConfigController } from './attendance-config.controller';
import { AttendanceConfigService } from './attendance-config.service';
import { OrganizationModule } from '../../../platform/organization/public';
import { RosterImportProcessor } from './imports/roster-import.processor';
import { RosterImportQueue } from './imports/roster-import.queue';
import { RosterImportsController } from './imports/roster-imports.controller';
import { RosterImportsService } from './imports/roster-imports.service';
import { PolicyResolverCache } from './policy-resolver-cache.service';

@Module({
  imports: [OrganizationModule],
  controllers: [AttendanceConfigController, RosterImportsController],
  providers: [
    AttendanceConfigService,
    RosterImportProcessor,
    RosterImportQueue,
    RosterImportsService,
    PolicyResolverCache,
  ],
  exports: [AttendanceConfigService, RosterImportProcessor, RosterImportQueue],
})
export class AttendanceConfigModule {}
