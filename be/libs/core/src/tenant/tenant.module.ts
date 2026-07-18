import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { RequestContextMiddleware } from '../middlewares/request-context.middleware';

@Global()
@Module({
  providers: [TenantContextService, TenantMiddleware, RequestContextMiddleware],
  exports: [TenantContextService, TenantMiddleware],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // RequestContextMiddleware MUST run first so the correlation id is
    // established before anything else (logging, tenant resolution, handlers,
    // outbound ServiceClient calls). TenantModule is @Global and imported by
    // every service + the gateway, so this wires requestId everywhere.
    consumer
      .apply(RequestContextMiddleware, TenantMiddleware)
      .forRoutes('*');
  }
}
