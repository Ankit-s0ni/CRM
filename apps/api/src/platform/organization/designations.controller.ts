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
import { CreateDesignationDto } from './dto/create-designation.dto';
import { ListDesignationsQueryDto } from './dto/list-designations-query.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { DesignationsService } from './designations.service';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DESIGNATIONS_READ)
  @ApiOperation({ summary: 'List designations with optional search' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({
    schema: {
      example: {
        data: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      },
    },
  })
  listDesignations(@Query() query: ListDesignationsQueryDto) {
    return this.designationsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DESIGNATIONS_READ)
  @ApiOperation({ summary: 'Get a designation and assigned employee count' })
  @ApiOkResponse({
    schema: {
      example: {
        data: {
          id: '0191d2e7-9ec3-7b94-bb3c-624f9d8d7a10',
          name: 'Software Engineer',
          employeeCount: 8,
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Designation is absent in this tenant' })
  getDesignation(@Param('id', ParseUUIDPipe) id: string) {
    return this.designationsService.getById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DESIGNATIONS_CREATE)
  @ApiOperation({ summary: 'Create a designation' })
  @ApiCreatedResponse({ description: 'Designation created' })
  @ApiConflictResponse({ description: 'Designation name already exists' })
  createDesignation(@Body() dto: CreateDesignationDto) {
    return this.designationsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DESIGNATIONS_UPDATE)
  @ApiOperation({ summary: 'Rename a designation' })
  @ApiOkResponse({ description: 'Designation updated' })
  @ApiConflictResponse({ description: 'Designation name already exists' })
  updateDesignation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designationsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DESIGNATIONS_DELETE)
  @ApiOperation({ summary: 'Delete a designation when it is not assigned' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiConflictResponse({ description: 'Designation is assigned to employees' })
  deleteDesignation(@Param('id', ParseUUIDPipe) id: string) {
    return this.designationsService.remove(id);
  }
}
