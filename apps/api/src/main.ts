import 'dotenv/config';
import { AppModule } from './app.module';
import { bootstrapHttpApi } from './shared/bootstrap/bootstrap-http-api';

void bootstrapHttpApi(AppModule, {
  serviceName: 'deltcrm-api',
  port: process.env.PORT ?? 4001,
});
