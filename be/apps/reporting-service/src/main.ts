import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ReportingServiceModule } from './reporting-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(ReportingServiceModule, {
    logger: createAppLogger('reporting'),
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

  const port = process.env.REPORTING_SERVICE_PORT || 3006;
  await app.listen(port);
  console.log(`Reporting Service is running on port ${port}`);
}
bootstrap();
