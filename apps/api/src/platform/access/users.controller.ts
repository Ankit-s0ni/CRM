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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/public';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import {
  CreateEmployeeAccountDto,
  ListUsersQueryDto,
  UpdateUserRolesDto,
  UpdateUserEmailDto,
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

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get a tenant user by ID' })
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.get(id);
  }

  @Post('employee-accounts')
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @ApiOperation({
    summary:
      'Create an Employee login and return its one-time temporary credentials',
  })
  createEmployeeAccount(
    @Body() dto: CreateEmployeeAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.createEmployeeAccount(dto, actor.userId);
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

  @Patch(':id/email')
  @RequirePermissions(PERMISSIONS.USERS_INVITE)
  @ApiOperation({ summary: 'Update an employee login email' })
  updateEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserEmailDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateEmail(id, dto.email, actor.userId);
  }
}
