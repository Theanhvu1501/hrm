import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule, TenantModule } from '@app/core';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { CacheModule } from '@app/cache';
import { MetricsModule } from '@app/metrics';
import { MenuCatalog } from '@app/entities';
import { controllers } from './controllers';
import { TenantHeaderInterceptor } from './interceptors';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    CoreModule,
    TenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeatureRaw([MenuCatalog]),
    CacheModule,
    MetricsModule,
    HealthModule,
  ],
  controllers,
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantHeaderInterceptor },
  ],
})
export class GatewayModule {}
