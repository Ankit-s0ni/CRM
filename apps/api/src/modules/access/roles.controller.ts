import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import {
  CreateRoleDto,
  ReplaceRolePermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { RolesService } from './roles.service';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';

@ApiTags('Roles and Permissions')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Get the stable permission catalog by module' })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            module: 'organization',
            keys: ['organization.employees.read'],
          },
        ],
      },
    },
  })
  permissions() {
    return this.rolesService.permissions();
  }

  @Get('roles/permission-matrix')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Get roles and the complete permission matrix' })
  matrix() {
    return this.rolesService.matrix();
  }

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'List tenant roles' })
  listRoles() {
    return this.rolesService.list();
  }

  @Get('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Get a role and its permissions' })
  getRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.getById(id);
  }

  @Post('roles')
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  @ApiOperation({ summary: 'Create a custom tenant role' })
  @ApiCreatedResponse({ description: 'Custom role created' })
  createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.create(dto, user.userId);
  }

  @Patch('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  @ApiOperation({ summary: 'Rename a custom tenant role' })
  @ApiConflictResponse({ description: 'System role or duplicate role name' })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.update(id, dto, user.userId);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  @ApiOperation({ summary: 'Replace a role permission set atomically' })
  replacePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.replacePermissions(id, dto, user.userId);
  }

  @Delete('roles/:id')
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  @ApiOperation({ summary: 'Delete an unassigned custom role' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiConflictResponse({ description: 'System role or assigned custom role' })
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.remove(id, user.userId);
  }
}
