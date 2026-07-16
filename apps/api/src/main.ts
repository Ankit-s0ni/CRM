import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureOpenApi } from './openapi';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((value) =>
      value.trim(),
    ) ?? ['http://localhost:4002'],
    credentials: true,
  });

  configureOpenApi(app);

  await app.listen(process.env.PORT ?? 4001);
}
void bootstrap();
