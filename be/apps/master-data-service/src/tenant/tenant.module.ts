import { Module } from '@nestjs/common';
import { VaiTro, PhanQuyen, Nganh, AppUserRole, TenantAppConfig } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { ServiceClientModule } from '@app/service-client';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantAdminGuard } from '@app/auth';

@Module({
  imports: [
    // RAW repos for SuperAdmin operations on digital_book entities
    DatabaseModule.forFeatureRaw([VaiTro, PhanQuyen, Nganh]),
    // Default connection repos (AppUserRole + TenantAppConfig are TENANT_EXEMPT, so no proxy)
    DatabaseModule.forFeature([AppUserRole, TenantAppConfig]),
    // IdentityClient for forwarding requests to identity-service
    ServiceClientModule.forRoot(),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantAdminGuard],
  exports: [TenantService],
})
export class TenantModule {}
