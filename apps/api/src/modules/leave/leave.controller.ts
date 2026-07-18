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
  CreateLeavePolicyDto,
  CreateLeaveRequestDto,
  LeaveBalanceQueryDto,
  LeaveDecisionDto,
  LeaveRequestQueryDto,
  UpdateLeavePolicyDto,
} from './dto/leave.dto';
import { LeaveService } from './leave.service';

@ApiTags('Leave')
@ApiBearerAuth()
@RequireModule('LEAVE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get('leave-policies')
  @RequireAnyPermissions(PERMISSIONS.LEAVE_SELF, PERMISSIONS.LEAVE_MANAGE)
  @ApiOperation({ summary: 'List active and historical leave policy versions' })
  listPolicies() {
    return this.leave.listPolicies();
  }

  @Post('leave-policies')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  @ApiOperation({
    summary: 'Create a versioned leave policy and initial balances',
  })
  createPolicy(@Body() dto: CreateLeavePolicyDto) {
    return this.leave.createPolicy(dto);
  }

  @Patch('leave-policies/:id')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  @ApiOperation({
    summary: 'Create the next version of a leave policy configuration',
  })
  updatePolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeavePolicyDto,
  ) {
    return this.leave.updatePolicy(id, dto);
  }

  @Get('leave-balances/me')
  @RequirePermissions(PERMISSIONS.LEAVE_SELF)
  @ApiOperation({ summary: 'Get authenticated employee leave balances' })
  balancesMine() {
    return this.leave.balancesMine();
  }

  @Get('leave-balances')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  @ApiOperation({ summary: 'List tenant leave balances in HR scope' })
  balances(@Query() query: LeaveBalanceQueryDto) {
    return this.leave.balances(query);
  }

  @Get('leave-requests')
  @RequireAnyPermissions(
    PERMISSIONS.LEAVE_SELF,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.LEAVE_MANAGE,
  )
  @ApiOperation({ summary: 'List leave requests in caller approval scope' })
  requests(@Query() query: LeaveRequestQueryDto) {
    return this.leave.listRequests(query);
  }

  @Post('leave-requests')
  @RequirePermissions(PERMISSIONS.LEAVE_SELF)
  @ApiOperation({ summary: 'Submit leave and reserve available entitlement' })
  createRequest(@Body() dto: CreateLeaveRequestDto) {
    return this.leave.createRequest(dto);
  }

  @Get('leave-requests/:id')
  @RequireAnyPermissions(
    PERMISSIONS.LEAVE_SELF,
    PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.LEAVE_MANAGE,
  )
  @ApiOperation({ summary: 'Get one scoped leave request' })
  getRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.leave.getRequest(id);
  }

  @Post('leave-requests/:id/approve')
  @RequireAnyPermissions(PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_MANAGE)
  @ApiOperation({ summary: 'Approve leave and emit LeaveApproved' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeaveDecisionDto,
  ) {
    return this.leave.approve(id, dto);
  }

  @Post('leave-requests/:id/reject')
  @RequireAnyPermissions(PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_MANAGE)
  @ApiOperation({ summary: 'Reject leave and restore reserved entitlement' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LeaveDecisionDto,
  ) {
    return this.leave.reject(id, dto);
  }

  @Post('leave-requests/:id/cancel')
  @RequirePermissions(PERMISSIONS.LEAVE_SELF)
  @ApiOperation({
    summary: 'Cancel owned pending leave and restore entitlement',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.leave.cancel(id);
  }
}
