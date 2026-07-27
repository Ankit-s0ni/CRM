import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';
import { CurrentUser } from '../../../../shared/http/current-user.decorator';
import {
  ActivatePayComponentVersionCommand,
  ActivateSalaryStructureVersionCommand,
  AddComponentToSalaryStructureVersionCommand,
  AssignEmployeeToPayGroupCommand,
  CreateEmployeeCompensationVersionCommand,
  CreateEmployeePayrollProfileCommand,
  CreatePayComponentCommand,
  CreatePayComponentVersionCommand,
  CreatePayGroupCommand,
  CreatePayrollSettingsCommand,
  CreateSalaryStructureCommand,
  CreateSalaryStructureVersionCommand,
  EndEmployeeCompensationVersionCommand,
  RemoveComponentFromSalaryStructureVersionCommand,
  RemoveEmployeeFromPayGroupCommand,
  UpdateEmployeePayrollProfileCommand,
  UpdatePayGroupCommand,
  UpdatePayrollSettingsCommand,
} from '../../application/commands/payroll-foundation.commands';
import {
  AddSalaryStructureComponentDto,
  AssignEmployeeToPayGroupDto,
  CreateEmployeeCompensationVersionDto,
  CreateEmployeePayrollProfileDto,
  CreatePayComponentDto,
  CreatePayComponentVersionDto,
  CreatePayGroupDto,
  CreatePayrollSettingsDto,
  CreateSalaryStructureDto,
  CreateSalaryStructureVersionDto,
  EffectivePayrollPolicyQueryDto,
  EndEmployeeCompensationVersionDto,
  UpdateEmployeePayrollProfileDto,
  UpdatePayGroupDto,
  UpdatePayrollSettingsDto,
} from '../../application/dto/payroll-foundation.dto';
import {
  PayrollCommandResponseDto,
  PayrollListResponseDto,
  PayrollSettingsResponseDto,
  PayrollStatusCommandResponseDto,
  PayrollVersionedCommandResponseDto,
} from '../../application/dto/payroll-response.dto';
import {
  GetEffectivePayrollPolicyQuery,
  GetEmployeeCompensationHistoryQuery,
  GetEmployeeEffectiveCompensationQuery,
  GetEmployeePayrollProfileQuery,
  GetPayComponentQuery,
  GetPayComponentVersionHistoryQuery,
  GetPayGroupQuery,
  GetPayrollSettingsQuery,
  GetSalaryStructureQuery,
  GetSalaryStructureVersionHistoryQuery,
  ListPayComponentsQuery,
  ListPayGroupEmployeesQuery,
  ListPayGroupsQuery,
  ListSalaryStructuresQuery,
} from '../../application/queries/payroll-foundation.queries';

@ApiTags('Payroll foundation')
@ApiBearerAuth()
@RequireModule('PAYROLL')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollFoundationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('settings')
  @RequirePermissions(PERMISSIONS.PAYROLL_SETTINGS_READ)
  @ApiOperation({ summary: 'Get payroll settings for the workspace' })
  @ApiOkResponse({ type: PayrollSettingsResponseDto })
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetPayrollSettingsQuery(user.tenantId));
  }

  @Post('settings')
  @RequirePermissions(PERMISSIONS.PAYROLL_SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create payroll settings' })
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollSettingsDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollSettingsCommand(user.tenantId, user.userId, dto),
    );
  }

  @Patch('settings')
  @RequirePermissions(PERMISSIONS.PAYROLL_SETTINGS_MANAGE)
  @ApiOperation({
    summary: 'Update payroll settings with optimistic versioning',
  })
  @ApiOkResponse({ type: PayrollVersionedCommandResponseDto })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePayrollSettingsDto,
  ) {
    return this.commandBus.execute(
      new UpdatePayrollSettingsCommand(user.tenantId, user.userId, dto),
    );
  }

  @Get('pay-groups')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  listPayGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListPayGroupsQuery(user.tenantId));
  }

  @Post('pay-groups')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createPayGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayGroupDto,
  ) {
    return this.commandBus.execute(
      new CreatePayGroupCommand(user.tenantId, user.userId, dto),
    );
  }

  @Get('pay-groups/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getPayGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(new GetPayGroupQuery(user.tenantId, id));
  }

  @Patch('pay-groups/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOkResponse({ type: PayrollVersionedCommandResponseDto })
  updatePayGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayGroupDto,
  ) {
    return this.commandBus.execute(
      new UpdatePayGroupCommand(user.tenantId, user.userId, id, dto),
    );
  }

  @Get('pay-groups/:id/employees')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  listPayGroupEmployees(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(
      new ListPayGroupEmployeesQuery(user.tenantId, id),
    );
  }

  @Post('pay-groups/:id/employees')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_MANAGE)
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  assignEmployee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignEmployeeToPayGroupDto,
  ) {
    return this.commandBus.execute(
      new AssignEmployeeToPayGroupCommand(user.tenantId, user.userId, id, dto),
    );
  }

  @Delete('pay-groups/:id/employees/:employeeId')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_MANAGE)
  @ApiOkResponse({ type: PayrollStatusCommandResponseDto })
  removeEmployee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.commandBus.execute(
      new RemoveEmployeeFromPayGroupCommand(
        user.tenantId,
        user.userId,
        id,
        employeeId,
      ),
    );
  }

  @Get('components')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPONENTS_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  listComponents(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListPayComponentsQuery(user.tenantId));
  }

  @Post('components')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPONENTS_MANAGE)
  @ApiCreatedResponse({ type: PayrollCommandResponseDto })
  createComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayComponentDto,
  ) {
    return this.commandBus.execute(
      new CreatePayComponentCommand(user.tenantId, user.userId, dto),
    );
  }

  @Get('components/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPONENTS_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(new GetPayComponentQuery(user.tenantId, id));
  }

  @Get('components/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPONENTS_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getComponentHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(
      new GetPayComponentVersionHistoryQuery(user.tenantId, id),
    );
  }

  @Post('components/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPONENTS_MANAGE)
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createComponentVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePayComponentVersionDto,
  ) {
    return this.commandBus.execute(
      new CreatePayComponentVersionCommand(user.tenantId, user.userId, id, dto),
    );
  }

  @Post('components/:id/versions/:versionId/activate')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPONENTS_MANAGE)
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  activateComponentVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.commandBus.execute(
      new ActivatePayComponentVersionCommand(
        user.tenantId,
        user.userId,
        id,
        versionId,
      ),
    );
  }

  @Get('salary-structures')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  listStructures(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListSalaryStructuresQuery(user.tenantId));
  }

  @Post('salary-structures')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE)
  @ApiCreatedResponse({ type: PayrollCommandResponseDto })
  createStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.commandBus.execute(
      new CreateSalaryStructureCommand(user.tenantId, user.userId, dto),
    );
  }

  @Get('salary-structures/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(
      new GetSalaryStructureQuery(user.tenantId, id),
    );
  }

  @Get('salary-structures/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getStructureHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(
      new GetSalaryStructureVersionHistoryQuery(user.tenantId, id),
    );
  }

  @Post('salary-structures/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE)
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createStructureVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSalaryStructureVersionDto,
  ) {
    return this.commandBus.execute(
      new CreateSalaryStructureVersionCommand(
        user.tenantId,
        user.userId,
        id,
        dto,
      ),
    );
  }

  @Post('salary-structures/:id/versions/:versionId/activate')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE)
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  activateStructureVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.commandBus.execute(
      new ActivateSalaryStructureVersionCommand(
        user.tenantId,
        user.userId,
        id,
        versionId,
      ),
    );
  }

  @Post('salary-structures/versions/:versionId/components')
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE)
  @ApiCreatedResponse({ type: PayrollCommandResponseDto })
  addStructureComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: AddSalaryStructureComponentDto,
  ) {
    return this.commandBus.execute(
      new AddComponentToSalaryStructureVersionCommand(
        user.tenantId,
        user.userId,
        versionId,
        dto,
      ),
    );
  }

  @Delete(
    'salary-structures/versions/:versionId/components/:componentVersionId',
  )
  @RequirePermissions(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE)
  @ApiOkResponse({ type: PayrollStatusCommandResponseDto })
  removeStructureComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Param('componentVersionId', ParseUUIDPipe) componentVersionId: string,
  ) {
    return this.commandBus.execute(
      new RemoveComponentFromSalaryStructureVersionCommand(
        user.tenantId,
        user.userId,
        versionId,
        componentVersionId,
      ),
    );
  }

  @Get('employees/:employeeId/profile')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.queryBus.execute(
      new GetEmployeePayrollProfileQuery(user.tenantId, employeeId),
    );
  }

  @Post('employees/:employeeId/profile')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_MANAGE)
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateEmployeePayrollProfileDto,
  ) {
    return this.commandBus.execute(
      new CreateEmployeePayrollProfileCommand(
        user.tenantId,
        user.userId,
        employeeId,
        dto,
      ),
    );
  }

  @Patch('employees/:employeeId/profile')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_MANAGE)
  @ApiOkResponse({ type: PayrollVersionedCommandResponseDto })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateEmployeePayrollProfileDto,
  ) {
    return this.commandBus.execute(
      new UpdateEmployeePayrollProfileCommand(
        user.tenantId,
        user.userId,
        employeeId,
        dto,
      ),
    );
  }

  @Get('employees/:employeeId/compensation')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getCompensation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('effectiveDate')
    effectiveDate = new Date().toISOString().slice(0, 10),
  ) {
    return this.queryBus.execute(
      new GetEmployeeEffectiveCompensationQuery(
        user.tenantId,
        employeeId,
        effectiveDate,
      ),
    );
  }

  @Get('employees/:employeeId/compensation/history')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getCompensationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.queryBus.execute(
      new GetEmployeeCompensationHistoryQuery(user.tenantId, employeeId),
    );
  }

  @Post('employees/:employeeId/compensation')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_MANAGE)
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createCompensation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateEmployeeCompensationVersionDto,
  ) {
    return this.commandBus.execute(
      new CreateEmployeeCompensationVersionCommand(
        user.tenantId,
        user.userId,
        employeeId,
        dto,
      ),
    );
  }

  @Patch('employees/:employeeId/compensation/:compensationId/end')
  @RequirePermissions(PERMISSIONS.PAYROLL_COMPENSATION_MANAGE)
  @ApiOkResponse({ type: PayrollVersionedCommandResponseDto })
  endCompensation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('compensationId', ParseUUIDPipe) compensationId: string,
    @Body() dto: EndEmployeeCompensationVersionDto,
  ) {
    return this.commandBus.execute(
      new EndEmployeeCompensationVersionCommand(
        user.tenantId,
        user.userId,
        employeeId,
        compensationId,
        dto,
      ),
    );
  }

  @Get('policy-matrix/effective')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOkResponse({ type: PayrollListResponseDto })
  getEffectivePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EffectivePayrollPolicyQueryDto,
  ) {
    return this.queryBus.execute(
      new GetEffectivePayrollPolicyQuery(
        user.tenantId,
        query.employeeId,
        query.payGroupId,
        query.policyType,
        query.effectiveDate,
      ),
    );
  }
}
