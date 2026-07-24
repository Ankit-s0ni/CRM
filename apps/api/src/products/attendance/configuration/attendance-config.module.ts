import { Module } from '@nestjs/common';
import { AttendanceConfigController } from './attendance-config.controller';
import { AttendanceConfigService } from './attendance-config.service';
import { OrganizationModule } from '../../../platform/organization/public';
import { RosterImportProcessor } from './imports/roster-import.processor';
import { RosterImportQueue } from './imports/roster-import.queue';
import { RosterImportsController } from './imports/roster-imports.controller';
import { RosterImportsService } from './imports/roster-imports.service';
import { PolicyResolverCache } from './policy-resolver-cache.service';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaOfficeRepository } from './offices/infrastructure/prisma-office.repository';
import { IOfficeRepository } from './offices/domain/office.repository.interface';

// Office Handlers
import { CreateOfficeHandler } from './offices/application/commands/create-office.handler';
import { UpdateOfficeHandler } from './offices/application/commands/update-office.handler';
import { RemoveOfficeHandler } from './offices/application/commands/remove-office.handler';
import { GetOfficeHandler } from './offices/application/queries/get-office.handler';
import { ListOfficesHandler } from './offices/application/queries/list-offices.handler';
import { ListOfficeEmployeesHandler } from './offices/application/queries/list-office-employees.handler';
import { ReplaceOfficeEmployeesHandler } from './offices/application/commands/replace-office-employees.handler';

// Shift Handlers
import { IShiftRepository } from './shifts/domain/shift.repository.interface';
import { PrismaShiftRepository } from './shifts/infrastructure/prisma-shift.repository';
import { CreateShiftHandler } from './shifts/application/commands/create-shift.handler';
import { UpdateShiftHandler } from './shifts/application/commands/update-shift.handler';
import { RemoveShiftHandler } from './shifts/application/commands/remove-shift.handler';
import { ListShiftsHandler } from './shifts/application/queries/list-shifts.handler';
import { GetShiftHandler } from './shifts/application/queries/get-shift.handler';

// Holiday Handlers
import { IHolidayRepository } from './holidays/domain/holiday.repository.interface';
import { PrismaHolidayRepository } from './holidays/infrastructure/prisma-holiday.repository';
import { CreateHolidayHandler } from './holidays/application/commands/create-holiday.handler';
import { UpdateHolidayHandler } from './holidays/application/commands/update-holiday.handler';
import { RemoveHolidayHandler } from './holidays/application/commands/remove-holiday.handler';
import { ListHolidaysHandler } from './holidays/application/queries/list-holidays.handler';
import { PublicHolidaySyncService } from './holidays/public-holiday-sync.service';

// Roster Handlers
import { IRosterRepository } from './rosters/domain/roster.repository.interface';
import { PrismaRosterRepository } from './rosters/infrastructure/prisma-roster.repository';
import { CreateRosterHandler } from './rosters/application/commands/create-roster.handler';
import { BulkRostersHandler } from './rosters/application/commands/bulk-rosters.handler';
import { RemoveRosterHandler } from './rosters/application/commands/remove-roster.handler';
import { ListRostersHandler } from './rosters/application/queries/list-rosters.handler';
import { ResolveShiftHandler } from './rosters/application/queries/resolve-shift.handler';
import { BulkResolveShiftsHandler } from './rosters/application/queries/bulk-resolve-shifts.handler';

// Policy Handlers
import { IPolicyRepository } from './policies/domain/policy.repository.interface';
import { PrismaPolicyRepository } from './policies/infrastructure/prisma-policy.repository';
import { CreatePolicyHandler } from './policies/application/commands/create-policy.handler';
import { UpdatePolicyHandler } from './policies/application/commands/update-policy.handler';
import { RemovePolicyHandler } from './policies/application/commands/remove-policy.handler';
import { ReplacePolicyAssignmentsHandler } from './policies/application/commands/replace-policy-assignments.handler';
import { AssignEmployeePolicyHandler } from './policies/application/commands/assign-employee-policy.handler';
import { ListPoliciesHandler } from './policies/application/queries/list-policies.handler';
import { GetPolicyHandler } from './policies/application/queries/get-policy.handler';
import { ResolvePolicyHandler } from './policies/application/queries/resolve-policy.handler';
import { BulkResolvePoliciesHandler } from './policies/application/queries/bulk-resolve-policies.handler';

const OfficeHandlers = [
  CreateOfficeHandler,
  UpdateOfficeHandler,
  RemoveOfficeHandler,
  GetOfficeHandler,
  ListOfficesHandler,
  ListOfficeEmployeesHandler,
  ReplaceOfficeEmployeesHandler,
];

const ShiftHandlers = [
  CreateShiftHandler,
  UpdateShiftHandler,
  RemoveShiftHandler,
  ListShiftsHandler,
  GetShiftHandler,
];

const HolidayHandlers = [
  CreateHolidayHandler,
  UpdateHolidayHandler,
  RemoveHolidayHandler,
  ListHolidaysHandler,
];

const RosterHandlers = [
  CreateRosterHandler,
  BulkRostersHandler,
  RemoveRosterHandler,
  ListRostersHandler,
  ResolveShiftHandler,
  BulkResolveShiftsHandler,
];

const PolicyHandlers = [
  CreatePolicyHandler,
  UpdatePolicyHandler,
  RemovePolicyHandler,
  ReplacePolicyAssignmentsHandler,
  AssignEmployeePolicyHandler,
  ListPoliciesHandler,
  GetPolicyHandler,
  ResolvePolicyHandler,
  BulkResolvePoliciesHandler,
];

@Module({
  imports: [OrganizationModule, CqrsModule],
  controllers: [AttendanceConfigController, RosterImportsController],
  providers: [
    AttendanceConfigService,
    RosterImportProcessor,
    RosterImportQueue,
    RosterImportsService,
    PolicyResolverCache,
    PublicHolidaySyncService,
    {
      provide: IOfficeRepository,
      useClass: PrismaOfficeRepository,
    },
    {
      provide: IShiftRepository,
      useClass: PrismaShiftRepository,
    },
    {
      provide: IHolidayRepository,
      useClass: PrismaHolidayRepository,
    },
    {
      provide: IRosterRepository,
      useClass: PrismaRosterRepository,
    },
    {
      provide: IPolicyRepository,
      useClass: PrismaPolicyRepository,
    },
    ...OfficeHandlers,
    ...ShiftHandlers,
    ...HolidayHandlers,
    ...RosterHandlers,
    ...PolicyHandlers,
  ],
  exports: [AttendanceConfigService, RosterImportProcessor, RosterImportQueue],
})
export class AttendanceConfigModule {}
