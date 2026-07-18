import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { CDService } from './services/app-event';

// Note: RequestContextMiddleware is applied globally by TenantModule (which is
// @Global and imported by every service + the gateway), so it is intentionally
// NOT re-applied here to avoid running the middleware twice.
@Module({
  imports: [DiscoveryModule],
  providers: [CDService],
  exports: [CDService],
})
export class CoreModule {}
