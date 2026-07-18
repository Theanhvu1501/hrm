import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { CoreModule, TenantModule } from '@app/core';
import { AuthModule, EntitlementService, ModuleGuard } from '@app/auth';
import { DatabaseModule } from '@app/database';
import { LinhVuc, MenuCatalog } from '@app/entities';
import { controllers } from './controllers';
import { TenantHeaderInterceptor } from './interceptors';

@Module({
  imports: [
    CoreModule,
    TenantModule,
    AuthModule,
    DatabaseModule.forRoot(),
    DatabaseModule.forFeatureRaw([LinhVuc, MenuCatalog]),
  ],
  controllers,
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantHeaderInterceptor },
    EntitlementService,
    { provide: APP_GUARD, useClass: ModuleGuard },
  ],
})
export class GatewayModule {}
