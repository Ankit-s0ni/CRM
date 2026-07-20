import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/public';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  ResendInvitationDto,
} from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('Tenant Users')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('users/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @ApiOperation({ summary: 'Invite a tenant user with assigned roles' })
  @ApiCreatedResponse({ description: 'Invitation created' })
  create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.create(dto, user.userId);
  }

  @Post('resend')
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @ApiOperation({ summary: 'Invalidate and resend a pending invitation' })
  resend(
    @Body() dto: ResendInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.resend(dto, user.userId);
  }
}

@ApiTags('Authentication')
@Controller('auth/invitations')
export class InvitationAcceptanceController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('accept')
  @ApiOperation({ summary: 'Accept a single-use invitation and set password' })
  @ApiOkResponse({ description: 'User created and invitation consumed' })
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(dto);
  }
}
