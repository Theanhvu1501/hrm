import { NestFactory } from '@nestjs/core';
import { MasterDataServiceModule } from './master-data-service.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(MasterDataServiceModule, {
    logger: createAppLogger('master-data'),
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

  const port = process.env.SERVICE_MASTER_DATA_PORT || 3002;

  await app.listen(port);
  Logger.log(`Master Data Service running on port ${port}`, 'Bootstrap');
}
void bootstrap();
