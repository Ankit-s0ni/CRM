import 'dotenv/config';
import { HrmsApiModule } from './composition/hrms-api.module';
import { bootstrapHttpApi } from './shared/bootstrap/bootstrap-http-api';

void bootstrapHttpApi(HrmsApiModule, {
  serviceName: 'deltcrm-hrms-api',
  port: process.env.HRMS_API_PORT ?? 4012,
});
