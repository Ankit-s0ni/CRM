import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { ModuleGuard } from '../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { AttendanceConfigService } from './attendance-config.service';
import {
  AssignEmployeePolicyDto,
  AssignOfficeEmployeesDto,
  BulkResolveDto,
  BulkRosterDto,
  CreateHolidayDto,
  CreateOfficeDto,
  CreatePolicyDto,
  CreateRosterDto,
  CreateShiftDto,
  ReplacePolicyAssignmentsDto,
  RosterQueryDto,
  SyncPublicHolidaysDto,
  UpdateHolidayDto,
  UpdateOfficeDto,
  UpdatePolicyDto,
  UpdateShiftDto,
} from './dto/attendance-config.dto';

import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';

// Office Commands & Queries
import { CreateOfficeCommand } from './offices/application/commands/create-office.command';
import { UpdateOfficeCommand } from './offices/application/commands/update-office.command';
import { RemoveOfficeCommand } from './offices/application/commands/remove-office.command';
import { ReplaceOfficeEmployeesCommand } from './offices/application/commands/replace-office-employees.command';
import { ListOfficesQuery } from './offices/application/queries/list-offices.query';
import { GetOfficeQuery } from './offices/application/queries/get-office.query';
import { ListOfficeEmployeesQuery } from './offices/application/queries/list-office-employees.query';

// Shift Commands & Queries
import { CreateShiftCommand } from './shifts/application/commands/create-shift.command';
import { UpdateShiftCommand } from './shifts/application/commands/update-shift.command';
import { RemoveShiftCommand } from './shifts/application/commands/remove-shift.command';
import { ListShiftsQuery } from './shifts/application/queries/list-shifts.query';
import { GetShiftQuery } from './shifts/application/queries/get-shift.query';

// Holiday Commands & Queries
import { CreateHolidayCommand } from './holidays/application/commands/create-holiday.command';
import { UpdateHolidayCommand } from './holidays/application/commands/update-holiday.command';
import { RemoveHolidayCommand } from './holidays/application/commands/remove-holiday.command';
import { ListHolidaysQuery } from './holidays/application/queries/list-holidays.query';
import { PublicHolidaySyncService } from './holidays/public-holiday-sync.service';

// Roster Commands & Queries
import { CreateRosterCommand } from './rosters/application/commands/create-roster.command';
import { BulkRostersCommand } from './rosters/application/commands/bulk-rosters.command';
import { RemoveRosterCommand } from './rosters/application/commands/remove-roster.command';
import { ListRostersQuery } from './rosters/application/queries/list-rosters.query';
import { ResolveShiftQuery } from './rosters/application/queries/resolve-shift.query';
import { BulkResolveShiftsQuery } from './rosters/application/queries/bulk-resolve-shifts.query';

// Policy Commands & Queries
import { CreatePolicyCommand } from './policies/application/commands/create-policy.command';
import { UpdatePolicyCommand } from './policies/application/commands/update-policy.command';
import { RemovePolicyCommand } from './policies/application/commands/remove-policy.command';
import { ReplacePolicyAssignmentsCommand } from './policies/application/commands/replace-policy-assignments.command';
import { AssignEmployeePolicyCommand } from './policies/application/commands/assign-employee-policy.command';
import { ListPoliciesQuery } from './policies/application/queries/list-policies.query';
import { GetPolicyQuery } from './policies/application/queries/get-policy.query';
import { ResolvePolicyQuery } from './policies/application/queries/resolve-policy.query';
import { BulkResolvePoliciesQuery } from './policies/application/queries/bulk-resolve-policies.query';

@ApiTags('Attendance configuration')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class AttendanceConfigController {
  constructor(
    private readonly service: AttendanceConfigService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly publicHolidaySync: PublicHolidaySyncService,
  ) {}

  @Get('offices')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_READ)
  @ApiOperation({
    summary: 'List tenant office locations and assignment counts',
  })
  listOffices(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListOfficesQuery(user.tenantId));
  }

  @Post('offices')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Create an office and circular geofence' })
  createOffice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfficeDto,
  ) {
    return this.commandBus.execute(
      new CreateOfficeCommand(user.tenantId, dto, user.userId),
    );
  }

  @Get('offices/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_READ)
  @ApiOperation({ summary: 'Get an office with employees and holidays' })
  getOffice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(new GetOfficeQuery(id, user.tenantId));
  }

  @Patch('offices/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Update office geofence and network constraints' })
  updateOffice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeDto,
  ) {
    return this.commandBus.execute(
      new UpdateOfficeCommand(id, user.tenantId, dto, user.userId),
    );
  }

  @Delete('offices/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Delete an unused office' })
  removeOffice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new RemoveOfficeCommand(id, user.tenantId, user.userId),
    );
  }

  @Get('offices/:id/employees')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_READ)
  @ApiOperation({ summary: 'List employees assigned to an office' })
  officeEmployees(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(
      new ListOfficeEmployeesQuery(id, user.tenantId),
    );
  }

  @Put('offices/:id/employees')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Atomically replace office employee assignments' })
  replaceOfficeEmployees(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOfficeEmployeesDto,
  ) {
    return this.commandBus.execute(
      new ReplaceOfficeEmployeesCommand(id, user.tenantId, dto, user.userId),
    );
  }

  @Get('attendance-policies')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({ summary: 'List attendance policies and assignments' })
  listPolicies(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListPoliciesQuery(user.tenantId));
  }

  @Post('attendance-policies')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create an attendance policy' })
  createPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePolicyDto,
  ) {
    return this.commandBus.execute(new CreatePolicyCommand(user.tenantId, dto));
  }

  @Get('attendance-policies/resolve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({
    summary:
      'Resolve employee policy by employee, department, then tenant default',
  })
  resolvePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('date') date: string,
  ) {
    return this.queryBus.execute(
      new ResolvePolicyQuery(employeeId, user.tenantId, date),
    );
  }

  @Post('attendance-policies/resolve/bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({
    summary: 'Resolve policies for up to 500 employees without N+1 queries',
  })
  resolvePolicies(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkResolveDto,
  ) {
    return this.queryBus.execute(
      new BulkResolvePoliciesQuery(dto.employeeIds, user.tenantId, dto.date),
    );
  }

  @Get('attendance-policies/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({ summary: 'Get an attendance policy and assignments' })
  getPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(new GetPolicyQuery(id, user.tenantId));
  }

  @Patch('attendance-policies/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Update prospective attendance policy rules' })
  updatePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.commandBus.execute(
      new UpdatePolicyCommand(id, user.tenantId, dto),
    );
  }

  @Delete('attendance-policies/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Delete a policy and clear assignments' })
  removePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(new RemovePolicyCommand(id, user.tenantId));
  }

  @Put('attendance-policies/:id/assignments')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Atomically replace policy scope assignments' })
  replacePolicyAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplacePolicyAssignmentsDto,
  ) {
    return this.commandBus.execute(
      new ReplacePolicyAssignmentsCommand(id, user.tenantId, dto),
    );
  }

  @Put('attendance-policies/employees/:employeeId')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({
    summary: 'Set or clear one employee-specific attendance policy override',
  })
  assignEmployeePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: AssignEmployeePolicyDto,
  ) {
    return this.commandBus.execute(
      new AssignEmployeePolicyCommand(employeeId, user.tenantId, dto.policyId),
    );
  }

  @Get('shifts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({ summary: 'List tenant shifts' })
  listShifts(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListShiftsQuery(user.tenantId));
  }

  @Post('shifts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_MANAGE)
  @ApiOperation({ summary: 'Create a day or overnight shift' })
  createShift(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShiftDto,
  ) {
    return this.commandBus.execute(
      new CreateShiftCommand(user.tenantId, dto, user.userId),
    );
  }

  @Get('shifts/resolve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({ summary: 'Resolve employee shift for a date' })
  resolveShift(
    @CurrentUser() user: AuthenticatedUser,
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('date') date: string,
  ) {
    return this.queryBus.execute(
      new ResolveShiftQuery(user.tenantId, employeeId, date),
    );
  }

  @Post('shifts/resolve/bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({
    summary: 'Resolve shifts for up to 500 employees without N+1 queries',
  })
  resolveShifts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkResolveDto,
  ) {
    return this.queryBus.execute(
      new BulkResolveShiftsQuery(user.tenantId, dto.employeeIds, dto.date),
    );
  }

  @Get('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({ summary: 'Get a shift' })
  getShift(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(new GetShiftQuery(id, user.tenantId));
  }

  @Patch('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_MANAGE)
  @ApiOperation({ summary: 'Update shift times and overnight derivation' })
  updateShift(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.commandBus.execute(
      new UpdateShiftCommand(id, user.tenantId, dto, user.userId),
    );
  }

  @Delete('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_MANAGE)
  @ApiOperation({ summary: 'Delete an unused shift' })
  removeShift(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new RemoveShiftCommand(id, user.tenantId, user.userId),
    );
  }

  @Get('rosters')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_READ)
  @ApiOperation({ summary: 'List dated roster assignments' })
  listRosters(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RosterQueryDto,
  ) {
    return this.queryBus.execute(new ListRostersQuery(user.tenantId, query));
  }

  @Post('rosters')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Create an idempotent dated roster assignment' })
  createRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRosterDto,
  ) {
    return this.commandBus.execute(
      new CreateRosterCommand(user.tenantId, dto, user.userId),
    );
  }

  @Post('rosters/bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Bulk assign a shift with row-level conflicts' })
  bulkRosters(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkRosterDto,
  ) {
    return this.commandBus.execute(
      new BulkRostersCommand(user.tenantId, dto, user.userId),
    );
  }

  @Delete('rosters/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Delete a roster assignment' })
  removeRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new RemoveRosterCommand(id, user.tenantId, user.userId),
    );
  }

  @Get('holidays')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_READ)
  @ApiOperation({ summary: 'List tenant-wide and office holidays' })
  listHolidays(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListHolidaysQuery(user.tenantId));
  }

  @Post('holidays/sync')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({
    summary: 'Import public holidays for configured office regions',
  })
  syncPublicHolidays(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncPublicHolidaysDto,
  ) {
    return this.publicHolidaySync.sync(user.tenantId, user.userId, dto);
  }

  @Post('holidays')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({ summary: 'Create a tenant-wide or office holiday' })
  createHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHolidayDto,
  ) {
    return this.commandBus.execute(
      new CreateHolidayCommand(user.tenantId, dto, user.userId),
    );
  }

  @Patch('holidays/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({ summary: 'Update holiday name, date, or scope' })
  updateHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.commandBus.execute(
      new UpdateHolidayCommand(id, user.tenantId, dto, user.userId),
    );
  }

  @Delete('holidays/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({ summary: 'Delete a holiday' })
  removeHoliday(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new RemoveHolidayCommand(id, user.tenantId, user.userId),
    );
  }
}
