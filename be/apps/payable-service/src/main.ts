import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PayableServiceModule } from './payable-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(PayableServiceModule, {
    logger: createAppLogger('payable'),
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

  const port = process.env.PAYABLE_SERVICE_PORT || 3005;
  await app.listen(port);
  console.log(`Payable Service is running on port ${port}`);
}
bootstrap();
