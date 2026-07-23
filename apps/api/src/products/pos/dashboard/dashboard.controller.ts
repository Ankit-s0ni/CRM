import { Controller, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtTenantGuard } from '../../../platform/identity/public';
import { DashboardService } from './dashboard.service';

@ApiTags('POS Dashboard')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard)
@Controller('pos/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get POS dashboard overview metrics' })
  async getMetrics() {
    try {
      return await this.dashboardService.getMetrics();
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
