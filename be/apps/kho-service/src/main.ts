import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { KhoServiceModule } from './kho-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(KhoServiceModule, {
    logger: createAppLogger('kho'),
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors();
  const port = process.env.KHO_SERVICE_PORT || 3008;
  await app.listen(port);
  console.log(`Kho Service is running on port ${port}`);
}
bootstrap();
