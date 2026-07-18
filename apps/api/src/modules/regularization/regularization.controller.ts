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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleGuard } from '../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequireModule } from '../../shared/authorization/require-module.decorator';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import {
  CreateRegularizationDto,
  RegularizationAttachmentDto,
  RegularizationDecisionDto,
  RegularizationQueryDto,
} from './dto/regularization.dto';
import { RegularizationService } from './regularization.service';

@ApiTags('Regularizations')
@ApiBearerAuth()
@RequireModule('REGULARIZATION')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('regularizations')
export class RegularizationController {
  constructor(private readonly regularizations: RegularizationService) {}

  @Get()
  @RequireAnyPermissions(
    PERMISSIONS.REGULARIZATIONS_SELF,
    PERMISSIONS.REGULARIZATIONS_MANAGE,
    PERMISSIONS.ATTENDANCE_APPROVALS_MANAGE,
  )
  @ApiOperation({ summary: 'List regularization requests in caller scope' })
  list(@Query() query: RegularizationQueryDto) {
    return this.regularizations.list(query);
  }

  @Get('me')
  @RequirePermissions(PERMISSIONS.REGULARIZATIONS_SELF)
  @ApiOperation({ summary: 'List authenticated employee correction requests' })
  mine(@Query() query: RegularizationQueryDto) {
    return this.regularizations.list({ ...query, employeeId: undefined });
  }

  @Post()
  @RequirePermissions(PERMISSIONS.REGULARIZATIONS_SELF)
  @ApiOperation({ summary: 'Submit an attendance correction request' })
  create(@Body() dto: CreateRegularizationDto) {
    return this.regularizations.create(dto);
  }

  @Post('attachments/presign')
  @RequirePermissions(PERMISSIONS.REGULARIZATIONS_SELF)
  @ApiOperation({ summary: 'Create a private correction-evidence upload URL' })
  presign(@Body() dto: RegularizationAttachmentDto) {
    return this.regularizations.presignAttachment(dto);
  }

  @Get(':id')
  @RequireAnyPermissions(
    PERMISSIONS.REGULARIZATIONS_SELF,
    PERMISSIONS.REGULARIZATIONS_MANAGE,
    PERMISSIONS.ATTENDANCE_APPROVALS_MANAGE,
  )
  @ApiOperation({ summary: 'Get one scoped regularization request' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.regularizations.get(id);
  }

  @Post(':id/approve')
  @RequireAnyPermissions(
    PERMISSIONS.REGULARIZATIONS_MANAGE,
    PERMISSIONS.ATTENDANCE_APPROVALS_MANAGE,
  )
  @ApiOperation({ summary: 'Approve and recompute a correction request' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegularizationDecisionDto,
  ) {
    return this.regularizations.approve(id, dto);
  }

  @Post(':id/reject')
  @RequireAnyPermissions(
    PERMISSIONS.REGULARIZATIONS_MANAGE,
    PERMISSIONS.ATTENDANCE_APPROVALS_MANAGE,
  )
  @ApiOperation({ summary: 'Reject a correction request' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegularizationDecisionDto,
  ) {
    return this.regularizations.reject(id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.REGULARIZATIONS_SELF)
  @ApiOperation({ summary: 'Cancel an owned pending correction request' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.regularizations.cancel(id);
  }
}
