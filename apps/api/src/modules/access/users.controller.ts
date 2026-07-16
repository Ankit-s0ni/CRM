import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import {
  ListUsersQueryDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './dto/user-access.dto';
import { UsersService } from './users.service';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';

@ApiTags('Tenant Users')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'List tenant users and assigned roles' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Patch(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS_ROLES_UPDATE)
  @ApiOperation({ summary: 'Replace tenant role assignments for a user' })
  replaceRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.replaceRoles(id, dto, actor.userId);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.USERS_STATUS_UPDATE)
  @ApiOperation({ summary: 'Enable, disable, or lock tenant user access' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto, actor.userId);
  }
}
