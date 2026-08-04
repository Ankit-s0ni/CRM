import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
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
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';
import { CurrentUser } from '../../../../shared/http/current-user.decorator';
import {
  AcknowledgePayrollValidationIssueDto,
  CreatePayrollRunDto,
  CreatePayrollRunInputDto,
  ImportPayrollAttendanceSnapshotDto,
  PreviewPayrollInputCsvDto,
  PayrollRunListResponseDto,
  PayrollRunResponseDto,
} from '../../application/dto/payroll-run-preparation.dto';
import { PayrollRunPreparationService } from '../../application/services/payroll-run-preparation.service';

@ApiTags('Payroll run preparation')
@ApiBearerAuth()
@RequireModule('PAYROLL')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('payroll/runs')
export class PayrollRunPreparationController {
  constructor(private readonly service: PayrollRunPreparationService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_READ)
  @ApiOperation({ summary: 'List payroll runs' })
  @ApiOkResponse({ type: PayrollRunListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listRuns(user.tenantId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({ summary: 'Create a Payroll input-preparation run' })
  @ApiCreatedResponse({ type: PayrollRunResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.service.createRun(actor(user), dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_READ)
  @ApiOperation({ summary: 'Get a payroll run' })
  @ApiOkResponse({ type: PayrollRunResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getRun(user.tenantId, id);
  }

  @Post(':id/attendance-snapshot')
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({ summary: 'Import locked attendance snapshot rows' })
  @ApiCreatedResponse({ type: PayrollRunResponseDto })
  importAttendanceSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportPayrollAttendanceSnapshotDto,
  ) {
    return this.service.importAttendanceSnapshot(actor(user), id, dto);
  }

  @Post(':id/inputs')
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({
    summary: 'Add a recurring, one-time, joiner, or leaver input',
  })
  @ApiCreatedResponse({ type: PayrollRunResponseDto })
  addInput(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePayrollRunInputDto,
  ) {
    return this.service.addInput(actor(user), id, dto);
  }

  @Post(':id/input-imports/preview')
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({ summary: 'Parse and validate a Payroll input CSV preview' })
  @ApiCreatedResponse({ type: PayrollRunResponseDto })
  previewInputCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewPayrollInputCsvDto,
  ) {
    return this.service.previewInputCsv(actor(user), id, dto);
  }

  @Post(':id/input-imports/:importId/commit')
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({ summary: 'Commit a previously validated Payroll input CSV' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollRunResponseDto })
  commitInputImport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('importId', ParseUUIDPipe) importId: string,
  ) {
    return this.service.commitInputImport(actor(user), id, importId);
  }

  @Post(':id/validate')
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({
    summary: 'Validate run readiness and mark INPUTS_READY if clean',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollRunResponseDto })
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.validateRun(actor(user), id);
  }

  @Get(':id/readiness')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_READ)
  @ApiOperation({ summary: 'Get payroll run readiness' })
  @ApiOkResponse({ type: PayrollRunResponseDto })
  readiness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.readiness(user.tenantId, id);
  }

  @Get(':id/validation-issues')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_READ)
  @ApiOperation({ summary: 'List payroll run validation issues' })
  @ApiOkResponse({ type: PayrollRunListResponseDto })
  validationIssues(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listValidationIssues(user.tenantId, id);
  }

  @Patch('validation-issues/:issueId/acknowledge')
  @RequirePermissions(PERMISSIONS.PAYROLL_INPUTS_MANAGE)
  @ApiOperation({ summary: 'Acknowledge a payroll validation issue' })
  @ApiOkResponse({ type: PayrollRunResponseDto })
  acknowledgeIssue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @Body() dto: AcknowledgePayrollValidationIssueDto,
  ) {
    return this.service.acknowledgeIssue(actor(user), issueId, dto);
  }
}

function actor(user: AuthenticatedUser) {
  return { tenantId: user.tenantId, userId: user.userId };
}
