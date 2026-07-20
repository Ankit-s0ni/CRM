import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtTenantGuard } from '../identity/public';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('departments')
export class OrganizationController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_READ)
  @ApiOperation({ summary: 'List departments in flat or tree view' })
  @ApiQuery({ name: 'view', required: false, enum: ['flat', 'tree'] })
  @ApiOkResponse({
    description: 'Flat departments or a nested tree assembled from one query',
    schema: { example: { data: [] } },
  })
  listDepartments(@Query() query: ListDepartmentsQueryDto) {
    return this.departmentsService.list(query.view ?? 'flat');
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_READ)
  @ApiOperation({ summary: 'Get a department with child and employee counts' })
  @ApiOkResponse({
    schema: {
      example: {
        data: {
          id: '0191d2e7-9ec3-7b94-bb3c-624f9d8d7a10',
          name: 'Operations',
          parentDeptId: null,
          counts: { children: 2, employees: 12 },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Department is absent in this tenant' })
  getDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.getById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_CREATE)
  @ApiOperation({ summary: 'Create a root or child department' })
  @ApiCreatedResponse({ description: 'Department created' })
  @ApiConflictResponse({ description: 'Duplicate root or sibling name' })
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_UPDATE)
  @ApiOperation({ summary: 'Rename or move a department' })
  @ApiOkResponse({ description: 'Department updated' })
  @ApiConflictResponse({
    description: 'Duplicate name, hierarchy cycle, or maximum depth exceeded',
  })
  updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_DELETE)
  @ApiOperation({
    summary: 'Delete a department when it has no children or employees',
  })
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiConflictResponse({ description: 'Department has children or employees' })
  deleteDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.remove(id);
  }
}
