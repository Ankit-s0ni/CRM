import 'dotenv/config';
import { PlatformApiModule } from './composition/platform-api.module';
import { bootstrapHttpApi } from './shared/bootstrap/bootstrap-http-api';

void bootstrapHttpApi(PlatformApiModule, {
  serviceName: 'deltcrm-platform-api',
  port: process.env.PLATFORM_API_PORT ?? 4011,
});
