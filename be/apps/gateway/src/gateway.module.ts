import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule, TenantModule } from '@app/core';
import { AuthModule } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { MenuCatalog } from '@app/entities';
import { controllers } from './controllers';
import { TenantHeaderInterceptor } from './interceptors';

@Module({
  imports: [
    CoreModule,
    TenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeatureRaw([MenuCatalog]),
  ],
  controllers,
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantHeaderInterceptor },
  ],
})
export class GatewayModule {}
