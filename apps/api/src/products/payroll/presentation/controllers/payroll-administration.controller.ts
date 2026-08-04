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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';
import { CurrentUser } from '../../../../shared/http/current-user.decorator';
import {
  ActivatePayrollApprovalPolicyVersionCommand,
  ActivatePayrollCalendarCommand,
  ActivatePayrollPolicyVersionCommand,
  CreatePayrollAccountingMappingCommand,
  CreatePayrollApprovalPolicyCommand,
  CreatePayrollApprovalPolicyVersionCommand,
  CreatePayrollCalendarCommand,
  CreatePayrollCalendarVersionCommand,
  CreatePayrollPolicyCommand,
  CreatePayrollPolicyVersionCommand,
  DeactivatePayrollCalendarCommand,
  UpdatePaymentDetailStatusCommand,
  UpdatePayrollAccountingMappingCommand,
  UpdatePayrollApprovalPolicyCommand,
  UpdatePayrollCalendarCommand,
  UpdatePayrollPolicyCommand,
  UpdateStatutoryDetailStatusCommand,
  UpsertEmployeePaymentDetailCommand,
  UpsertEmployeeStatutoryDetailCommand,
} from '../../application/commands/payroll-administration.commands';
import {
  CreatePayrollAccountingMappingDto,
  CreatePayrollApprovalPolicyDto,
  CreatePayrollApprovalPolicyVersionDto,
  CreatePayrollCalendarDto,
  CreatePayrollCalendarVersionDto,
  CreatePayrollPolicyDto,
  CreatePayrollPolicyVersionDto,
  PayrollAuditQueryDto,
  UpdatePayrollAccountingMappingDto,
  UpdatePayrollApprovalPolicyDto,
  UpdatePayrollCalendarDto,
  UpdatePayrollPolicyDto,
  UpdateProtectedDetailStatusDto,
  UpsertEmployeePaymentDetailDto,
  UpsertEmployeeStatutoryDetailDto,
} from '../../application/dto/payroll-administration.dto';
import {
  PayrollAuditResponseDto,
  PayrollCommandResponseDto,
  PayrollListResponseDto,
  PayrollMaskedPaymentDetailResponseDto,
  PayrollMaskedStatutoryDetailResponseDto,
  PayrollStatusCommandResponseDto,
  PayrollVersionedCommandResponseDto,
} from '../../application/dto/payroll-response.dto';
import {
  GetPayrollAuditHistoryQuery,
  GetPayrollCalendarQuery,
  ListEmployeePaymentDetailsQuery,
  ListEmployeeStatutoryDetailsQuery,
  ListPayrollAccountingMappingsQuery,
  ListPayrollApprovalPoliciesQuery,
  ListPayrollCalendarsQuery,
  ListPayrollPoliciesQuery,
} from '../../application/queries/payroll-administration.queries';

@ApiTags('Payroll administration')
@ApiBearerAuth()
@RequireModule('PAYROLL')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollAdministrationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('calendars')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOperation({ summary: 'List payroll calendars' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  listCalendars(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListPayrollCalendarsQuery(user.tenantId));
  }

  @Post('calendars')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a payroll calendar' })
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollCalendarDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollCalendarCommand(actor(user), dto),
    );
  }

  @Get('calendars/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOperation({ summary: 'Get a payroll calendar and its versions' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.queryBus.execute(
      new GetPayrollCalendarQuery(user.tenantId, id),
    );
  }

  @Patch('calendars/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Update a payroll calendar' })
  @ApiOkResponse({ type: PayrollVersionedCommandResponseDto })
  updateCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollCalendarDto,
  ) {
    return this.commandBus.execute(
      new UpdatePayrollCalendarCommand(actor(user), id, dto),
    );
  }

  @Post('calendars/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a payroll calendar version' })
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createCalendarVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePayrollCalendarVersionDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollCalendarVersionCommand(actor(user), id, dto),
    );
  }

  @Post('calendars/:id/activate')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Activate a payroll calendar' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  activateCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new ActivatePayrollCalendarCommand(actor(user), id),
    );
  }

  @Post('calendars/:id/deactivate')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Deactivate a payroll calendar' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  deactivateCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commandBus.execute(
      new DeactivatePayrollCalendarCommand(actor(user), id),
    );
  }

  @Get('policies')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOperation({ summary: 'List payroll policies' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  listPolicies(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListPayrollPoliciesQuery(user.tenantId));
  }

  @Post('policies')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a payroll policy' })
  @ApiCreatedResponse({ type: PayrollCommandResponseDto })
  createPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollPolicyDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollPolicyCommand(actor(user), dto),
    );
  }

  @Patch('policies/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Update a payroll policy' })
  @ApiOkResponse({ type: PayrollCommandResponseDto })
  updatePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollPolicyDto,
  ) {
    return this.commandBus.execute(
      new UpdatePayrollPolicyCommand(actor(user), id, dto),
    );
  }

  @Post('policies/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a payroll policy version' })
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createPolicyVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePayrollPolicyVersionDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollPolicyVersionCommand(actor(user), id, dto),
    );
  }

  @Post('policies/:id/versions/:versionId/activate')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Activate a payroll policy version' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  activatePolicyVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.commandBus.execute(
      new ActivatePayrollPolicyVersionCommand(actor(user), id, versionId),
    );
  }

  @Get('employees/:employeeId/payment-details')
  @RequirePermissions(PERMISSIONS.PAYROLL_PROTECTED_DATA_READ)
  @ApiOperation({ summary: 'List masked employee payment details' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  listPaymentDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.queryBus.execute(
      new ListEmployeePaymentDetailsQuery(user.tenantId, employeeId),
    );
  }

  @Post('employees/:employeeId/payment-details')
  @RequirePermissions(PERMISSIONS.PAYROLL_PROTECTED_DATA_MANAGE)
  @ApiOperation({ summary: 'Create or replace employee payment details' })
  @ApiCreatedResponse({ type: PayrollMaskedPaymentDetailResponseDto })
  upsertPaymentDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpsertEmployeePaymentDetailDto,
  ) {
    return this.commandBus.execute(
      new UpsertEmployeePaymentDetailCommand(actor(user), employeeId, dto),
    );
  }

  @Patch('payment-details/:id/status')
  @RequirePermissions(PERMISSIONS.PAYROLL_PROTECTED_DATA_MANAGE)
  @ApiOperation({ summary: 'Update employee payment detail status' })
  @ApiOkResponse({ type: PayrollMaskedPaymentDetailResponseDto })
  setPaymentDetailStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProtectedDetailStatusDto,
  ) {
    return this.commandBus.execute(
      new UpdatePaymentDetailStatusCommand(actor(user), id, dto),
    );
  }

  @Get('employees/:employeeId/statutory-details')
  @RequirePermissions(PERMISSIONS.PAYROLL_PROTECTED_DATA_READ)
  @ApiOperation({ summary: 'List masked employee statutory details' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  listStatutoryDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.queryBus.execute(
      new ListEmployeeStatutoryDetailsQuery(user.tenantId, employeeId),
    );
  }

  @Post('employees/:employeeId/statutory-details')
  @RequirePermissions(PERMISSIONS.PAYROLL_PROTECTED_DATA_MANAGE)
  @ApiOperation({ summary: 'Create or replace employee statutory details' })
  @ApiCreatedResponse({ type: PayrollMaskedStatutoryDetailResponseDto })
  upsertStatutoryDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpsertEmployeeStatutoryDetailDto,
  ) {
    return this.commandBus.execute(
      new UpsertEmployeeStatutoryDetailCommand(actor(user), employeeId, dto),
    );
  }

  @Patch('statutory-details/:id/status')
  @RequirePermissions(PERMISSIONS.PAYROLL_PROTECTED_DATA_MANAGE)
  @ApiOperation({ summary: 'Update employee statutory detail status' })
  @ApiOkResponse({ type: PayrollMaskedStatutoryDetailResponseDto })
  setStatutoryDetailStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProtectedDetailStatusDto,
  ) {
    return this.commandBus.execute(
      new UpdateStatutoryDetailStatusCommand(actor(user), id, dto),
    );
  }

  @Get('approval-policies')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_READ)
  @ApiOperation({ summary: 'List payroll approval policies' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  listApprovalPolicies(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(
      new ListPayrollApprovalPoliciesQuery(user.tenantId),
    );
  }

  @Post('approval-policies')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a payroll approval policy' })
  @ApiCreatedResponse({ type: PayrollCommandResponseDto })
  createApprovalPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollApprovalPolicyDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollApprovalPolicyCommand(actor(user), dto),
    );
  }

  @Patch('approval-policies/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Update a payroll approval policy' })
  @ApiOkResponse({ type: PayrollCommandResponseDto })
  updateApprovalPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollApprovalPolicyDto,
  ) {
    return this.commandBus.execute(
      new UpdatePayrollApprovalPolicyCommand(actor(user), id, dto),
    );
  }

  @Post('approval-policies/:id/versions')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Create a payroll approval policy version' })
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createApprovalPolicyVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePayrollApprovalPolicyVersionDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollApprovalPolicyVersionCommand(actor(user), id, dto),
    );
  }

  @Post('approval-policies/:id/versions/:versionId/activate')
  @RequirePermissions(PERMISSIONS.PAYROLL_POLICIES_MANAGE)
  @ApiOperation({ summary: 'Activate a payroll approval policy version' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollStatusCommandResponseDto })
  activateApprovalPolicyVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.commandBus.execute(
      new ActivatePayrollApprovalPolicyVersionCommand(
        actor(user),
        id,
        versionId,
      ),
    );
  }

  @Get('accounting-mappings')
  @RequirePermissions(PERMISSIONS.PAYROLL_ACCOUNTING_READ)
  @ApiOperation({ summary: 'List payroll accounting mappings' })
  @ApiOkResponse({ type: PayrollListResponseDto })
  listAccountingMappings(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(
      new ListPayrollAccountingMappingsQuery(user.tenantId),
    );
  }

  @Post('accounting-mappings')
  @RequirePermissions(PERMISSIONS.PAYROLL_ACCOUNTING_MANAGE)
  @ApiOperation({ summary: 'Create a payroll accounting mapping' })
  @ApiCreatedResponse({ type: PayrollVersionedCommandResponseDto })
  createAccountingMapping(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollAccountingMappingDto,
  ) {
    return this.commandBus.execute(
      new CreatePayrollAccountingMappingCommand(actor(user), dto),
    );
  }

  @Patch('accounting-mappings/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_ACCOUNTING_MANAGE)
  @ApiOperation({ summary: 'Update a payroll accounting mapping' })
  @ApiOkResponse({ type: PayrollVersionedCommandResponseDto })
  updateAccountingMapping(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollAccountingMappingDto,
  ) {
    return this.commandBus.execute(
      new UpdatePayrollAccountingMappingCommand(actor(user), id, dto),
    );
  }

  @Get('audit')
  @RequirePermissions(PERMISSIONS.PAYROLL_AUDIT_READ)
  @ApiOperation({ summary: 'List payroll audit history for this workspace' })
  @ApiOkResponse({ type: PayrollAuditResponseDto })
  auditHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PayrollAuditQueryDto,
  ) {
    return this.queryBus.execute(
      new GetPayrollAuditHistoryQuery(user.tenantId, query),
    );
  }
}

function actor(user: AuthenticatedUser) {
  return { tenantId: user.tenantId, userId: user.userId };
}
