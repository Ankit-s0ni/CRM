import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../../platform/identity/public';
import { ModuleGuard } from '../../../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../../shared/authorization/permissions.guard';
import { RequireModule } from '../../../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../../shared/http/authenticated-user';
import {
  CreateRosterImportDto,
  RosterImportPresignDto,
} from '../dto/attendance-config.dto';
import { RosterImportsService } from './roster-imports.service';

@ApiTags('Roster imports')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('rosters/imports')
export class RosterImportsController {
  constructor(private readonly service: RosterImportsService) {}
  @Post('presign')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Create a private roster CSV upload URL' })
  presign(@Body() dto: RosterImportPresignDto) {
    return this.service.presign(dto);
  }
  @Post()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_MANAGE)
  @ApiOperation({ summary: 'Register and queue an idempotent roster import' })
  register(
    @Body() dto: CreateRosterImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.register(dto, user.userId);
  }
  @Get(':id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_ROSTERS_READ)
  @ApiOperation({ summary: 'Get roster import summary and safe row errors' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
}
