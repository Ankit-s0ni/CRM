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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleGuard } from '../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../../../platform/identity/public';
import {
  AlertDecisionDto,
  CreateAlertRuleDto,
  ListSecurityAlertsDto,
  ListVerificationLogsDto,
  UpdateAlertRuleDto,
} from './dto/security-alert.dto';
import { SecurityAlertsService } from './security-alerts.service';

@ApiTags('Attendance security')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class SecurityAlertsController {
  constructor(private readonly security: SecurityAlertsService) {}

  @Get('verification-logs')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VERIFICATION_READ)
  @ApiOperation({ summary: 'List redacted attendance verification logs' })
  verificationLogs(@Query() query: ListVerificationLogsDto) {
    return this.security.verificationLogs(query);
  }

  @Get('alert-rules')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ALERT_RULES_MANAGE)
  @ApiOperation({ summary: 'List security alert rules' })
  rules() {
    return this.security.rules();
  }

  @Post('alert-rules')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ALERT_RULES_MANAGE)
  @ApiOperation({ summary: 'Create a security alert rule' })
  createRule(@Body() dto: CreateAlertRuleDto) {
    return this.security.createRule(dto);
  }

  @Patch('alert-rules/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ALERT_RULES_MANAGE)
  @ApiOperation({ summary: 'Update a security alert rule' })
  updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.security.updateRule(id, dto);
  }

  @Delete('alert-rules/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ALERT_RULES_MANAGE)
  @ApiOperation({ summary: 'Delete an unused security alert rule' })
  deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.security.deleteRule(id);
  }

  @Get('security-alerts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_READ)
  @ApiOperation({ summary: 'List tenant security alerts' })
  alerts(@Query() query: ListSecurityAlertsDto) {
    return this.security.alerts(query);
  }

  @Get('security-alerts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_READ)
  @ApiOperation({ summary: 'Get a security alert' })
  alert(@Param('id', ParseUUIDPipe) id: string) {
    return this.security.alert(id);
  }

  @Get('security-alerts/:id/evidence')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_VERIFICATION_READ)
  @ApiOperation({ summary: 'Get short-lived private alert evidence' })
  evidence(@Param('id', ParseUUIDPipe) id: string) {
    return this.security.evidence(id);
  }

  @Post('security-alerts/:id/acknowledge')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_MANAGE)
  @ApiOperation({ summary: 'Acknowledge a security alert' })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlertDecisionDto,
  ) {
    return this.security.decide(id, 'ACKNOWLEDGED', dto);
  }

  @Post('security-alerts/:id/resolve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_MANAGE)
  @ApiOperation({ summary: 'Resolve a security alert' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlertDecisionDto,
  ) {
    return this.security.decide(id, 'RESOLVED', dto);
  }

  @Post('security-alerts/:id/dismiss')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SECURITY_ALERTS_MANAGE)
  @ApiOperation({ summary: 'Dismiss a security alert' })
  dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlertDecisionDto,
  ) {
    return this.security.decide(id, 'DISMISSED', dto);
  }
}
