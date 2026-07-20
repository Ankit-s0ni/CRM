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
import { JwtTenantGuard } from '../../identity/jwt-tenant.guard';
import { PERMISSIONS } from '../../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../../shared/authorization/require-permissions.decorator';
import { RequireAnyPermissions } from '../../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/http/authenticated-user';
import {
  ListEmployeeImportsQueryDto,
  PresignEmployeeImportDto,
  RegisterEmployeeImportDto,
} from './dto/employee-import.dto';
import { EmployeeImportsService } from './employee-imports.service';

@ApiTags('Employee Imports')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('employee-imports')
export class EmployeeImportsController {
  constructor(
    private readonly employeeImportsService: EmployeeImportsService,
  ) {}

  @Get('schema')
  @RequireAnyPermissions(PERMISSIONS.IMPORTS_READ, PERMISSIONS.IMPORTS_CREATE)
  @ApiOperation({
    summary: 'Get the supported employee CSV schema and template',
  })
  schema() {
    return this.employeeImportsService.schema();
  }

  @Post('presign')
  @RequirePermissions(PERMISSIONS.IMPORTS_CREATE)
  @ApiOperation({ summary: 'Create a private CSV upload URL' })
  presign(@Body() dto: PresignEmployeeImportDto) {
    return this.employeeImportsService.presign(dto);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.IMPORTS_CREATE)
  @ApiOperation({ summary: 'Validate and queue an uploaded employee CSV' })
  register(
    @Body() dto: RegisterEmployeeImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeeImportsService.register(dto, user.userId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.IMPORTS_READ)
  @ApiOperation({ summary: 'List employee import jobs' })
  list(@Query() query: ListEmployeeImportsQueryDto) {
    return this.employeeImportsService.list(query);
  }

  @Get(':id/errors')
  @RequirePermissions(PERMISSIONS.IMPORTS_READ)
  @ApiOperation({ summary: 'Get safe row-level import errors' })
  errors(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeeImportsService.errors(id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.IMPORTS_READ)
  @ApiOperation({ summary: 'Get employee import progress and summary' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeeImportsService.getById(id);
  }

  @Post(':id/retry')
  @RequirePermissions(PERMISSIONS.IMPORTS_CREATE)
  @ApiOperation({ summary: 'Idempotently retry failed valid rows' })
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeeImportsService.retry(id);
  }
}
