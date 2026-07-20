import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import {
  PresignEmployeeDocumentDto,
  RegisterEmployeeDocumentDto,
} from './dto/employee-document.dto';
import { EmployeeDocumentsService } from './employee-documents.service';

@ApiTags('Employee Documents')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@Controller('employees/:employeeId/documents')
export class EmployeeDocumentsController {
  constructor(private readonly documents: EmployeeDocumentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS_READ)
  @ApiOperation({ summary: 'List safe employee document metadata' })
  list(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.documents.list(employeeId);
  }

  @Post('presign')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS_MANAGE)
  @ApiOperation({ summary: 'Create a private employee document upload URL' })
  presign(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: PresignEmployeeDocumentDto,
  ) {
    return this.documents.presign(employeeId, dto);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS_MANAGE)
  @ApiOperation({ summary: 'Register uploaded employee document metadata' })
  register(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: RegisterEmployeeDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.register(employeeId, dto, user.userId);
  }

  @Get(':documentId/download')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS_READ)
  @ApiOperation({ summary: 'Create a short-lived private document URL' })
  download(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documents.download(employeeId, documentId);
  }

  @Delete(':documentId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS_MANAGE)
  @ApiOperation({ summary: 'Permanently delete an employee document' })
  remove(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.remove(employeeId, documentId, user.userId);
  }
}
