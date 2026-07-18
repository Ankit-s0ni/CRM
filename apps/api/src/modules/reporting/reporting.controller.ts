import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportType } from '@prisma/client';
import { ModuleGuard } from '../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequireModule } from '../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { CreateReportDto, ReportListQueryDto } from './dto/reporting.dto';
import { ReportingService } from './reporting.service';

@ApiTags('Reports')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('reports')
export class ReportingController {
  constructor(private readonly reports: ReportingService) {}

  @Post('muster')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Queue a versioned muster export' })
  muster(@Body() dto: CreateReportDto) {
    return this.reports.create(ReportType.MUSTER, dto);
  }

  @Post('payroll-export')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Queue a payroll contract v1 export' })
  payroll(@Body() dto: CreateReportDto) {
    return this.reports.create(ReportType.PAYROLL, dto);
  }

  @Post('late-ot')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Queue a late and overtime export' })
  lateOt(@Body() dto: CreateReportDto) {
    return this.reports.create(ReportType.LATE_OT, dto);
  }

  @Post('violations')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Queue a verification violations export' })
  violations(@Body() dto: CreateReportDto) {
    return this.reports.create(ReportType.VIOLATIONS, dto);
  }

  @Post('field-distance')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Queue a field-distance export' })
  fieldDistance(@Body() dto: CreateReportDto) {
    return this.reports.create(ReportType.FIELD_DISTANCE, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_READ)
  @ApiOperation({ summary: 'List report jobs and their current states' })
  list(@Query() query: ReportListQueryDto) {
    return this.reports.list(query);
  }

  @Get(':id/download')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_READ)
  @ApiOperation({ summary: 'Create a short-lived private report download URL' })
  download(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.download(id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_REPORTS_READ)
  @ApiOperation({
    summary: 'Get one report job and immutable snapshot metadata',
  })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.get(id);
  }
}
