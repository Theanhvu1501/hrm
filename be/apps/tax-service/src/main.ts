import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { TaxServiceModule } from './tax-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(TaxServiceModule, {
    logger: createAppLogger('tax'),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors();
  const port = process.env.TAX_SERVICE_PORT || 3009;
  await app.listen(port);
  console.log(`Tax Service is running on port ${port}`);
}
bootstrap();
