import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MamNonServiceModule } from './mam-non-service.module';
import { createAppLogger, LoggingInterceptor, GlobalExceptionFilter } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(MamNonServiceModule, { logger: createAppLogger('mam-non') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors();
  const port = process.env.MAM_NON_SERVICE_PORT || 3010;
  await app.listen(port);
  console.log(`Mam Non Service is running on port ${port}`);
}
bootstrap();
