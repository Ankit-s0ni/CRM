import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureOpenApi } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
