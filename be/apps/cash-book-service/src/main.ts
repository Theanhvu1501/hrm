import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { CashBookServiceModule } from './cash-book-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(CashBookServiceModule, {
    logger: createAppLogger('cash-book'),
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

  const port = process.env.CASH_BOOK_SERVICE_PORT || 3004;
  await app.listen(port);
  console.log(`Cash Book Service is running on port ${port}`);
}
bootstrap();
