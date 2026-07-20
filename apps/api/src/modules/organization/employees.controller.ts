import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeAccountDto } from './dto/create-employee-account.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import {
  ReactivateEmployeeDto,
  TerminateEmployeeDto,
} from './dto/terminate-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequireAnyPermissions(
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
    PERMISSIONS.EMPLOYEES_SELF_READ,
  )
  @ApiOperation({ summary: 'List employees with filters and quota usage' })
  listEmployees(
    @Query() query: ListEmployeesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.list(query, user.userId);
  }

  @Get('me')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_SELF_READ)
  @ApiOperation({ summary: 'Get the authenticated employee profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.me(user.userId);
  }

  @Get('next-code')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Suggest the next available employee code' })
  nextCode() {
    return this.employeesService.nextCode();
  }

  @Get('quota')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Get employee quota usage' })
  quota() {
    return this.employeesService.quota();
  }

  @Get(':id/history')
  @RequireAnyPermissions(
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
    PERMISSIONS.EMPLOYEES_SELF_READ,
  )
  @ApiOperation({ summary: 'Get an employee employment-event timeline' })
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.history(id, user.userId);
  }

  @Get(':id/workspace')
  @RequireAnyPermissions(
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
    PERMISSIONS.EMPLOYEES_SELF_READ,
  )
  @ApiOperation({
    summary: 'Get a role-scoped employee workspace summary',
  })
  workspace(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.workspace(
      id,
      user.userId,
      new Set(user.permissions ?? []),
    );
  }

  @Get(':id')
  @RequireAnyPermissions(
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_REPORTS_READ,
    PERMISSIONS.EMPLOYEES_SELF_READ,
  )
  @ApiOperation({ summary: 'Get an employee profile' })
  getEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.getById(id, user.userId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  @ApiOperation({ summary: 'Create an employee under the workspace quota' })
  createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.create(dto, user.userId);
  }

  @Post(':id/account')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({
    summary: 'Create the employee login and return a temporary password',
  })
  createEmployeeAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmployeeAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.createAccount(id, dto.email, user.userId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Update an employee and their relationships' })
  updateEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.update(id, dto, user.userId);
  }

  @Post(':id/terminate')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_LIFECYCLE)
  @ApiOperation({ summary: 'Terminate an employee' })
  terminateEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.terminate(id, dto, user.userId);
  }

  @Post(':id/reactivate')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_LIFECYCLE)
  @ApiOperation({ summary: 'Reactivate a terminated employee under quota' })
  reactivateEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactivateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeesService.reactivate(id, dto, user.userId);
  }
}
