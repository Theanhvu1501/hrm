import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { createAppLogger, GlobalExceptionFilter } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule, {
    bodyParser: false,
    logger: createAppLogger('gateway'),
  });

  // No LoggingInterceptor here: the gateway streams the proxied response, so
  // the response status code is not yet known when the interceptor's tap fires.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable CORS for all origins
  app.enableCors({
    origin: '*',
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    // credentials: false,
    // allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.setGlobalPrefix('/api/');

  const port = process.env.PORT ?? 3000;

  Logger.log('Service run on port: ' + port);

  await app.listen(port);
}
void bootstrap();
