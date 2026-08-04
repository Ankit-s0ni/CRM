import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../../../shared/authorization/require-permissions.decorator';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';
import { CurrentUser } from '../../../../shared/http/current-user.decorator';
import {
  GeneratePayrollOutputDto,
  MarkPayrollPaidDto,
  PayrollActionReasonDto,
  PayrollOverrideResultDto,
  PayrollProcessingResponseDto,
} from '../../application/dto/payroll-processing.dto';
import { PayrollProcessingService } from '../../application/services/payroll-processing.service';

@ApiTags('Payroll processing')
@ApiBearerAuth()
@RequireModule('PAYROLL')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollProcessingController {
  constructor(private readonly service: PayrollProcessingService) {}

  @Post('runs/:id/calculate')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_CALCULATE)
  @ApiOperation({ summary: 'Calculate payroll run results' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  calculate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.calculate(actor(user), id);
  }

  @Get('payslips/me')
  @RequirePermissions(PERMISSIONS.PAYROLL_PAYSLIPS_SELF)
  @ApiOperation({ summary: 'List published payslips for the current employee' })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  listMyPayslips(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyPayslips(actor(user));
  }

  @Get('payslips/me/:id/download')
  @RequirePermissions(PERMISSIONS.PAYROLL_PAYSLIPS_SELF)
  @ApiOperation({
    summary: 'Create a signed download URL for my published payslip',
  })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  downloadMyPayslip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.downloadMyPayslip(actor(user), id);
  }

  @Post('runs/:id/review')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_CALCULATE)
  @ApiOperation({ summary: 'Mark calculated payroll run as reviewed' })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayrollActionReasonDto,
  ) {
    return this.service.review(actor(user), id, dto);
  }

  @Post('runs/:id/approve')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_APPROVE)
  @ApiOperation({ summary: 'Approve a reviewed payroll run' })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayrollActionReasonDto,
  ) {
    return this.service.approve(actor(user), id, dto);
  }

  @Post('runs/:id/finalize')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_FINALIZE)
  @ApiOperation({ summary: 'Finalize an approved payroll run' })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  finalize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayrollActionReasonDto,
  ) {
    return this.service.finalize(actor(user), id, dto);
  }

  @Patch('results/:id/override')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_CALCULATE)
  @ApiOperation({
    summary: 'Override a calculated employee result before approval',
  })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  overrideResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayrollOverrideResultDto,
  ) {
    return this.service.overrideResult(actor(user), id, dto);
  }

  @Post('runs/:id/outputs')
  @RequireAnyPermissions(
    PERMISSIONS.PAYROLL_PAYSLIPS_PUBLISH,
    PERMISSIONS.PAYROLL_REPORTS_GENERATE,
  )
  @ApiOperation({
    summary: 'Generate payslip, register, bank, or accounting outputs',
  })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  generateOutput(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GeneratePayrollOutputDto,
  ) {
    return this.service.generateOutput(actor(user), id, dto);
  }

  @Post('runs/:id/publish')
  @RequirePermissions(PERMISSIONS.PAYROLL_PAYSLIPS_PUBLISH)
  @ApiOperation({ summary: 'Publish generated payslips' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.publish(actor(user), id);
  }

  @Post('runs/:id/payments')
  @RequirePermissions(PERMISSIONS.PAYROLL_PAYMENTS_MANAGE)
  @ApiOperation({ summary: 'Record payroll payment status' })
  @ApiCreatedResponse({ type: PayrollProcessingResponseDto })
  markPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPayrollPaidDto,
  ) {
    return this.service.markPaid(actor(user), id, dto);
  }

  @Get('runs/:id/payslips')
  @RequirePermissions(PERMISSIONS.PAYROLL_PAYSLIPS_READ)
  @ApiOperation({ summary: 'List payslips generated for a payroll run' })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  listPayslips(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listPayslips(user.tenantId, id);
  }

  @Get('runs/:id/jobs')
  @RequirePermissions(PERMISSIONS.PAYROLL_RUNS_READ)
  @ApiOperation({ summary: 'List background jobs for a payroll run' })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  listJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listJobs(user.tenantId, id);
  }

  @Get('payslips/:id/download')
  @RequirePermissions(PERMISSIONS.PAYROLL_PAYSLIPS_READ)
  @ApiOperation({ summary: 'Create a signed payslip download URL' })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  downloadPayslip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.downloadPayslip(actor(user), id);
  }

  @Get('outputs/:id/download')
  @RequirePermissions(PERMISSIONS.PAYROLL_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Create a signed payroll output download URL' })
  @ApiOkResponse({ type: PayrollProcessingResponseDto })
  downloadOutput(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.downloadOutput(actor(user), id);
  }
}

function actor(user: AuthenticatedUser) {
  return { tenantId: user.tenantId, userId: user.userId };
}
