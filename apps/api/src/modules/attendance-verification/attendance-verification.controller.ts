import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ModuleGuard } from '../../shared/authorization/module.guard';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequireModule } from '../../shared/authorization/require-module.decorator';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import { AttendanceVerificationService } from './attendance-verification.service';
import {
  PunchEvidencePresignDto,
  VerifiedPunchDto,
} from './dto/verified-punch.dto';

@ApiTags('Attendance verification')
@ApiBearerAuth()
@RequireModule('ATTENDANCE')
@UseGuards(JwtTenantGuard, ModuleGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceVerificationController {
  constructor(private readonly verification: AttendanceVerificationService) {}

  @Post('punch-evidence/presign')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({ summary: 'Create a private mobile punch selfie upload URL' })
  presign(@Body() dto: PunchEvidencePresignDto) {
    return this.verification.presignEvidence(dto);
  }

  @Post('punches')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_RECORDS_SELF_READ)
  @ApiOperation({
    summary: 'Record a mobile punch through the verification pipeline',
  })
  punch(
    @Body() dto: VerifiedPunchDto,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verification.punch(dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      jwtDeviceId: user.deviceId,
    });
  }
}
