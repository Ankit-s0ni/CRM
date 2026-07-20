import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Headers,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleGuard } from '../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';
import {
  FieldPingBatchDto,
  StartFieldSessionDto,
  StopFieldSessionDto,
} from './dto/field-tracking.dto';
import { FieldPingService } from './field-ping.service';
import { FieldSessionService } from './field-session.service';
import { FieldRouteService } from './route/field-route.service';

@ApiTags('Field tracking')
@ApiBearerAuth()
@RequireModule('FIELD_TRACKING')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class FieldTrackingController {
  constructor(
    private readonly sessions: FieldSessionService,
    private readonly pings: FieldPingService,
    private readonly routes: FieldRouteService,
  ) {}

  @Post('field-sessions/start')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Start an idempotent field tracking session' })
  start(@Body() dto: StartFieldSessionDto) {
    return this.sessions.start(dto);
  }

  @Post('field-sessions/:id/stop')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Stop the authenticated employee field session' })
  stop(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: StopFieldSessionDto,
  ) {
    return this.sessions.stop(id, dto);
  }

  @Get('field-sessions/me/active')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Get the authenticated employee active session' })
  active() {
    return this.sessions.active();
  }

  @Post('field-pings/batch')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Ingest a bounded idempotent location batch' })
  ingest(@Body() dto: FieldPingBatchDto) {
    return this.pings.ingest(dto);
  }

  @Get('field/employees/live')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_FIELD_LIVE_READ)
  @ApiOperation({ summary: 'List live, stale, and offline field employees' })
  live() {
    return this.routes.live();
  }

  @Get('field/employees/:employeeId/routes/:date')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_FIELD_ROUTES_READ)
  @ApiOperation({ summary: 'Get a deterministic employee route summary' })
  route(
    @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
    @Param('date') date: string,
  ) {
    return this.routes.route(employeeId, date);
  }

  @Sse('field/stream')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_FIELD_LIVE_READ)
  @ApiOperation({ summary: 'Subscribe to scoped field presence updates' })
  stream(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('last-event-id') lastEventId?: string,
  ) {
    return this.routes.stream(user, lastEventId);
  }
}
