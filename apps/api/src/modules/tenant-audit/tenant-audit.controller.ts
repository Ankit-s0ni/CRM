import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { ListTenantAuditQueryDto } from './dto/list-tenant-audit-query.dto';
import { TenantAuditService } from './tenant-audit.service';

@ApiTags('Tenant Audit')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('audit-logs')
export class TenantAuditController {
  constructor(private readonly audit: TenantAuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Search the current tenant audit history' })
  list(@Query() query: ListTenantAuditQueryDto) {
    return this.audit.list(query);
  }
}
