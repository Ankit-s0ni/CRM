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
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { ModuleGuard } from '../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequireModule } from '../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
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
  UpdateHolidayDto,
  UpdateOfficeDto,
  UpdatePolicyDto,
  UpdateShiftDto,
} from './dto/attendance-config.dto';

@ApiTags('Attendance configuration')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class AttendanceConfigController {
  constructor(private readonly service: AttendanceConfigService) {}

  @Get('offices')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_READ)
  @ApiOperation({
    summary: 'List tenant office locations and assignment counts',
  })
  listOffices() {
    return this.service.listOffices();
  }

  @Post('offices')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Create an office and circular geofence' })
  createOffice(@Body() dto: CreateOfficeDto) {
    return this.service.createOffice(dto);
  }

  @Get('offices/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_READ)
  @ApiOperation({ summary: 'Get an office with employees and holidays' })
  getOffice(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOffice(id);
  }

  @Patch('offices/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Update office geofence and network constraints' })
  updateOffice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeDto,
  ) {
    return this.service.updateOffice(id, dto);
  }

  @Delete('offices/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Delete an unused office' })
  removeOffice(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeOffice(id);
  }

  @Get('offices/:id/employees')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_READ)
  @ApiOperation({ summary: 'List employees assigned to an office' })
  officeEmployees(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listOfficeEmployees(id);
  }

  @Put('offices/:id/employees')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_OFFICES_MANAGE)
  @ApiOperation({ summary: 'Atomically replace office employee assignments' })
  replaceOfficeEmployees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOfficeEmployeesDto,
  ) {
    return this.service.replaceOfficeEmployees(id, dto);
  }

  @Get('attendance-policies')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({ summary: 'List attendance policies and assignments' })
  listPolicies() {
    return this.service.listPolicies();
  }

  @Post('attendance-policies')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create an attendance policy' })
  createPolicy(@Body() dto: CreatePolicyDto) {
    return this.service.createPolicy(dto);
  }

  @Get('attendance-policies/resolve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({
    summary:
      'Resolve employee policy by employee, department, then tenant default',
  })
  resolvePolicy(
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('date') date: string,
  ) {
    return this.service.resolvePolicy(employeeId, date);
  }

  @Post('attendance-policies/resolve/bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({
    summary: 'Resolve policies for up to 500 employees without N+1 queries',
  })
  resolvePolicies(@Body() dto: BulkResolveDto) {
    return this.service.resolvePolicies(dto.employeeIds, dto.date);
  }

  @Get('attendance-policies/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_READ)
  @ApiOperation({ summary: 'Get an attendance policy and assignments' })
  getPolicy(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPolicy(id);
  }

  @Patch('attendance-policies/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Update prospective attendance policy rules' })
  updatePolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.service.updatePolicy(id, dto);
  }

  @Delete('attendance-policies/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Delete an unassigned attendance policy' })
  removePolicy(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removePolicy(id);
  }

  @Put('attendance-policies/:id/assignments')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Atomically replace policy scope assignments' })
  replacePolicyAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplacePolicyAssignmentsDto,
  ) {
    return this.service.replacePolicyAssignments(id, dto);
  }

  @Put('attendance-policies/employees/:employeeId')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_POLICIES_MANAGE)
  @ApiOperation({
    summary: 'Set or clear one employee-specific attendance policy override',
  })
  assignEmployeePolicy(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: AssignEmployeePolicyDto,
  ) {
    return this.service.assignEmployeePolicy(employeeId, dto.policyId);
  }

  @Get('shifts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({ summary: 'List tenant shifts' })
  listShifts() {
    return this.service.listShifts();
  }

  @Post('shifts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_MANAGE)
  @ApiOperation({ summary: 'Create a day or overnight shift' })
  createShift(@Body() dto: CreateShiftDto) {
    return this.service.createShift(dto);
  }

  @Get('shifts/resolve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({ summary: 'Resolve employee shift for a date' })
  resolveShift(
    @Query('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('date') date: string,
  ) {
    return this.service.resolveShift(employeeId, date);
  }

  @Post('shifts/resolve/bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({
    summary: 'Resolve shifts for up to 500 employees without N+1 queries',
  })
  resolveShifts(@Body() dto: BulkResolveDto) {
    return this.service.resolveShifts(dto.employeeIds, dto.date);
  }

  @Get('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_READ)
  @ApiOperation({ summary: 'Get a shift' })
  getShift(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getShift(id);
  }

  @Patch('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_MANAGE)
  @ApiOperation({ summary: 'Update shift times and overnight derivation' })
  updateShift(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.service.updateShift(id, dto);
  }

  @Delete('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SHIFTS_MANAGE)
  @ApiOperation({ summary: 'Delete an unused shift' })
  removeShift(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeShift(id);
  }

  @Get('rosters')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_READ)
  @ApiOperation({ summary: 'List dated roster assignments' })
  listRosters(@Query() query: RosterQueryDto) {
    return this.service.listRosters(query);
  }

  @Post('rosters')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Create an idempotent dated roster assignment' })
  createRoster(@Body() dto: CreateRosterDto) {
    return this.service.createRoster(dto);
  }

  @Post('rosters/bulk')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Bulk assign a shift with row-level conflicts' })
  bulkRosters(@Body() dto: BulkRosterDto) {
    return this.service.bulkRosters(dto);
  }

  @Delete('rosters/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Delete a roster assignment' })
  removeRoster(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeRoster(id);
  }

  @Get('holidays')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_READ)
  @ApiOperation({ summary: 'List tenant-wide and office holidays' })
  listHolidays() {
    return this.service.listHolidays();
  }

  @Post('holidays')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({ summary: 'Create a tenant-wide or office holiday' })
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.service.createHoliday(dto);
  }

  @Patch('holidays/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({ summary: 'Update holiday name, date, or scope' })
  updateHoliday(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.service.updateHoliday(id, dto);
  }

  @Delete('holidays/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_HOLIDAYS_MANAGE)
  @ApiOperation({ summary: 'Delete a holiday' })
  removeHoliday(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeHoliday(id);
  }
}
