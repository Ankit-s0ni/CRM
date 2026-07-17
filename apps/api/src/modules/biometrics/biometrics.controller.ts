import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ModuleGuard } from '../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequireModule } from '../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { BiometricsService } from './biometrics.service';
import {
  CompleteEnrollmentDto,
  CreateBiometricConsentDto,
  EnrollmentPresignDto,
  ResetFaceEnrollmentDto,
} from './dto/biometrics.dto';

@ApiTags('Biometrics')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller()
export class BiometricsController {
  constructor(private readonly biometrics: BiometricsService) {}

  @Get('biometric-consents/me')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Get the authenticated employee biometric consent' })
  currentConsent() {
    return this.biometrics.currentConsent();
  }

  @Post('biometric-consents')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Accept the current biometric consent policy' })
  createConsent(
    @Body() dto: CreateBiometricConsentDto,
    @Req() request: Request,
  ) {
    return this.biometrics.createConsent(
      dto,
      request.ip,
      request.get('user-agent'),
    );
  }

  @Delete('biometric-consents/me')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Withdraw the authenticated employee consent' })
  withdrawConsent() {
    return this.biometrics.withdrawConsent();
  }

  @Post('face-enrollments/presign')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Create a private face enrollment upload URL' })
  presign(@Body() dto: EnrollmentPresignDto) {
    return this.biometrics.presign(dto);
  }

  @Post('face-enrollments')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Complete liveness-backed face enrollment' })
  complete(@Body() dto: CompleteEnrollmentDto) {
    return this.biometrics.complete(dto);
  }

  @Get('face-enrollments/me/status')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Get safe face enrollment eligibility status' })
  status() {
    return this.biometrics.status();
  }

  @Get('face-enrollments/:employeeId/status')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_BIOMETRICS_READ)
  @ApiOperation({ summary: 'Get safe employee biometric enrollment status' })
  employeeStatus(@Param('employeeId', new ParseUUIDPipe()) employeeId: string) {
    return this.biometrics.employeeStatus(employeeId);
  }

  @Post('face-enrollments/:employeeId/reset')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_BIOMETRICS_MANAGE)
  @ApiOperation({
    summary: 'Reset a locked employee face profile for re-enrollment',
  })
  resetEmployeeFace(
    @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
    @Body() dto: ResetFaceEnrollmentDto,
  ) {
    return this.biometrics.resetEmployeeFace(employeeId, dto.reason);
  }
}
