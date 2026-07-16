import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('healthz')
  @ApiOperation({ summary: 'Process liveness check' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  healthz() {
    return this.health.liveness();
  }

  @Get('readyz')
  @ApiOperation({ summary: 'Required dependency readiness check' })
  @ApiOkResponse({ schema: { example: { status: 'ready' } } })
  readyz() {
    return this.health.readiness();
  }
}
